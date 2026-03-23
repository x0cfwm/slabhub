"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem, getMarketProducts, uploadFile, deleteFile, listStatuses, recognizeImage } from "@/lib/api";
import {
    CardProfile,
    InventoryItem,
    InventoryStage,
    Condition,
    GradingCompany,
    ProductType,
    SealedIntegrity,
    Game,
    VariantType,
    Language,
    MarketProduct,
    WorkflowStatus
} from "@/lib/types";
import { getOptimizedImageUrl } from "@/lib/image-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Search, ChevronRight, ChevronLeft, Check, Package as PackageIcon, FileText, BadgeCheck, Box, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Camera, Sparkles } from "lucide-react";

type InventoryCategory = "SINGLE_CARD_RAW" | "SINGLE_CARD_GRADED" | "SEALED_PRODUCT";

export default function AddItemPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<InventoryCategory | null>(null);
    const [cards, setCards] = useState<MarketProduct[]>([]);
    const [search, setSearch] = useState("");
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
    const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const recognitionCancelledRef = useRef(false);

    const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const data = await listStatuses();
                setStatuses(data);
                // Set initial statusId if not set
                if (data.length > 0 && !formData.statusId) {
                    setFormData((prev: any) => ({ 
                        ...prev, 
                        statusId: data[0].id,
                        stage: (data[0].systemId as any) || prev.stage
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch statuses", err);
            }
        };
        fetchStatuses();
    }, []);

    // Unified Form State
    const [formData, setFormData] = useState<any>({
        acquisitionPrice: 0,
        acquisitionDate: new Date().toISOString().split("T")[0],
        stage: "ACQUIRED" as InventoryStage,
        statusId: "",
        quantity: 1,
        variantType: "NORMAL" as VariantType,
        language: "EN" as Language,
        listingPrice: 0,
        sellingDescription: "",
        configuration: {
            containsBoosters: false,
            containsFixedCards: false,
            containsPromo: false
        }
    });

    useEffect(() => {
        const fetchCards = async () => {
            if (search.length >= 2) {
                try {
                    let productTypeFilter = undefined;
                    if (category === "SEALED_PRODUCT") {
                        productTypeFilter = "SEALED_OTHER,SEALED_BOX,SEALED_PACK";
                    }
                    const response = await getMarketProducts({
                        page: 1,
                        limit: 10,
                        search,
                        productType: productTypeFilter
                    });
                    setCards(response.items);
                } catch (error) {
                    console.error("Failed to search cards", error);
                }
            } else {
                setCards([]);
                if (search.length === 0) {
                    setFormData((prev: any) => ({ ...prev, baseCardId: undefined, cardVariantId: undefined, refPriceChartingProductId: undefined }));
                }
            }
        };

        const timer = setTimeout(fetchCards, 300);
        return () => clearTimeout(timer);
    }, [search, category]);

    const handleImageRecognize = async (file: File) => {
        recognitionCancelledRef.current = false;
        setIsRecognizing(true);
        try {
            // First upload the file to get a URL for preview/storage
            const { url } = await uploadFile(file);
            setUploadedPhotos([url]);
            
            // Then recognize
            const result = await recognizeImage(file);
            
            if (result.success && result.data && !recognitionCancelledRef.current) {
                const d = result.data;
                const newFormData = { ...formData };
                
                if (d.cardName) {
                    setSearch(d.cardName);
                }
                
                if (d.grader) {
                    setCategory("SINGLE_CARD_GRADED");
                    newFormData.type = "SINGLE_CARD_GRADED";
                    
                    let grader = d.grader.toUpperCase();
                    if (grader === "BECKETT") grader = "BGS";
                    
                    if (["PSA", "BGS"].includes(grader)) {
                        newFormData.gradeProvider = grader as GradingCompany;
                    } else {
                        newFormData.gradeProvider = "OTHER";
                    }
                    
                    if (d.gradeValue) {
                        newFormData.grade = d.gradeValue.toString();
                        newFormData.gradeValue = parseFloat(d.gradeValue.toString().replace(/[^\d.]/g, ''));
                    }
                    if (d.certNumber) newFormData.certNumber = d.certNumber;
                } else {
                    setCategory("SINGLE_CARD_RAW");
                    newFormData.type = "SINGLE_CARD_RAW";
                }
                
                if (d.language) newFormData.language = d.language as Language;
                if (d.refPriceChartingProductId) {
                    newFormData.refPriceChartingProductId = d.refPriceChartingProductId;
                    newFormData.baseCardId = d.refPriceChartingProductId;
                    newFormData.cardVariantId = d.refPriceChartingProductId;
                }
                
                setFormData(newFormData);
                setStep(2);
                toast.success("Card recognized successfully!");
            } else if (!recognitionCancelledRef.current) {
                console.warn("Recognition returned success: false", result);
                toast.error(`Recognize returned false: ${result.error || 'Unknown error'}`);
            }

        } catch (err: any) {
            if (!recognitionCancelledRef.current) {
                console.error("Recognition failed:", err);
                toast.error("Recognition failed. Please fill manually.");
            }
        } finally {
            setIsRecognizing(false);
        }
    };

    const handleSave = async () => {
        const today = new Date().toISOString().split("T")[0];
        if (formData.acquisitionDate > today) {
            toast.error("Acquisition date cannot be in the future");
            return;
        }

        setLoading(true);
        try {
            // Determine the final cardVariantId if it's a card
            const {
                type: _type,
                baseCardId: _baseCardId,
                cardVariantId: _cardVariantId,
                variantType: _variantType,
                language: _language,
                ...sanitizedFormData
            } = formData;

            const itemToSave = {
                ...sanitizedFormData,
                photos: uploadedPhotos,
                refPriceChartingProductId: isManualEntry ? undefined : formData.refPriceChartingProductId,
                itemType: category,
                // Clean up listing data if not LISTED
                listingPrice: formData.stage === "LISTED" ? (parseFloat(formData.listingPrice) || 0) : undefined,
                sellingDescription: formData.stage === "LISTED" ? formData.sellingDescription : undefined,
            };
            await createInventoryItem(itemToSave as any);
            toast.success("Item added to inventory");
            router.push("/inventory");
        } catch (err: any) {
            console.error("Failed to add item:", err);
            toast.error(err.message || "Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    const selectedCard = cards.find(c => c.id === (formData.refPriceChartingProductId || formData.cardVariantId));

    const applySealedPreset = (preset: "ILLUSTRATION_BOX" | "MINI_TIN") => {
        if (preset === "ILLUSTRATION_BOX") {
            setFormData({
                ...formData,
                productType: "ILLUSTRATION_BOX",
                configuration: {
                    containsBoosters: true,
                    boosterSets: [],
                    packsPerUnit: 10,
                    containsFixedCards: true,
                    containsPromo: true
                }
            });
        } else if (preset === "MINI_TIN") {
            setFormData({
                ...formData,
                productType: "MINI_TIN",
                configuration: {
                    containsBoosters: true,
                    boosterSets: [],
                    packsPerUnit: 2,
                    containsFixedCards: false,
                    containsPromo: false
                }
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Inventory Ingestion</h1>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={cn(
                                "h-2 w-12 rounded-full transition-all duration-300",
                                step >= s ? "bg-primary shadow-lg shadow-primary/50" : "bg-accent"
                            )}
                        />
                    ))}
                </div>
            </div>

            {isRecognizing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-center space-y-4 p-8 bg-card border border-primary/20 rounded-3xl shadow-2xl animate-in zoom-in-95">
                        <div className="relative mx-auto w-20 h-20">
                            <Loader2 className="w-20 h-20 animate-spin text-primary opacity-20" />
                            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Recognizing Card...</h3>
                            <p className="text-sm text-muted-foreground">Using AI to extract details and market prices</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                recognitionCancelledRef.current = true;
                                setIsRecognizing(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-8">
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-2xl px-5 py-4 cursor-pointer transition-all flex items-center gap-4",
                            isDragging
                                ? "border-primary bg-primary/10 shadow-xl ring-2 ring-primary/20"
                                : "border-primary/30 hover:border-primary/60 hover:bg-primary/5 bg-gradient-to-br from-primary/5 to-transparent"
                        )}
                        onClick={() => document.getElementById('recognition-upload')?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                                handleImageRecognize(file);
                            } else if (file) {
                                toast.error("Please upload an image file.");
                            }
                        }}
                    >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Camera className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">Start with a Photo</p>
                            <p className="text-xs text-muted-foreground truncate">
                                Drag & drop or click — AI will identify the card, grader &amp; market value
                            </p>
                        </div>
                        <Input
                            id="recognition-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageRecognize(file);
                            }}
                        />
                        <Button size="sm" className="rounded-full px-5 shrink-0" onClick={(e) => { e.stopPropagation(); document.getElementById('recognition-upload')?.click(); }}>
                            <Camera className="mr-2 h-3.5 w-3.5" /> Upload &amp; Recognize
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or proceed manually</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TypeCard
                            title="Raw Card"
                            description="Fungible single cards by condition."
                            icon={<FileText className="h-8 w-8 text-blue-500" />}
                            selected={category === "SINGLE_CARD_RAW"}
                            onClick={() => {
                                setCategory("SINGLE_CARD_RAW");
                                setFormData({ ...formData, quantity: 1, type: "SINGLE_CARD_RAW" });
                                setIsManualEntry(false);
                                setStep(2);
                            }}
                        />
                        <TypeCard
                            title="Graded Slab"
                            description="Non-fungible authenticated assets with Cert #."
                            icon={<BadgeCheck className="h-8 w-8 text-purple-500" />}
                            selected={category === "SINGLE_CARD_GRADED"}
                            onClick={() => {
                                setCategory("SINGLE_CARD_GRADED");
                                setFormData({ ...formData, quantity: 1, type: "SINGLE_CARD_GRADED" });
                                setIsManualEntry(false);
                                setStep(2);
                            }}
                        />
                        <TypeCard
                            title="Sealed Product"
                            description="Boosters, Boxes, and Collection items."
                            icon={<Box className="h-8 w-8 text-amber-500" />}
                            selected={category === "SEALED_PRODUCT"}
                            onClick={() => {
                                setCategory("SEALED_PRODUCT");
                                setFormData({ ...formData, quantity: 1, type: "SEALED_PRODUCT" });
                                setIsManualEntry(false);
                                setStep(2);
                            }}
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <Card className="border-primary/20 bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {category === "SINGLE_CARD_RAW" && "Raw Card Details"}
                                    {category === "SINGLE_CARD_GRADED" && "Graded Slab Details"}
                                    {category === "SEALED_PRODUCT" && "Sealed Product Details"}
                                </CardTitle>
                                <CardDescription>Provide professional grade specifications.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Change Type
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>{category === "SEALED_PRODUCT" ? "Search Product Model" : "Search Card Model"}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={category === "SEALED_PRODUCT" ? "Booster Box, ETB, Pack..." : "Luffy, Zoro, Nami..."}
                                        className="pl-9"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        disabled={isManualEntry}
                                    />
                                </div>

                                {!isManualEntry && (
                                    <div className="flex justify-end mt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsManualEntry(true);
                                                // Clear DB-linked fields when switching to manual
                                                setFormData((prev: any) => ({
                                                    ...prev,
                                                    refPriceChartingProductId: undefined,
                                                    baseCardId: undefined,
                                                    cardVariantId: undefined
                                                }));
                                            }}
                                            className="text-[10px] text-primary hover:underline font-medium"
                                        >
                                            Can't find it? Add manually
                                        </button>
                                    </div>
                                )}

                                {isManualEntry && (
                                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Item Name</Label>
                                                <Input
                                                    placeholder="e.g. Custom Bundle or Rare Collectible"
                                                    value={formData.productName || ""}
                                                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Set / Collection Name (Optional)</Label>
                                                <Input
                                                    placeholder="e.g. Custom Set"
                                                    value={formData.setName || ""}
                                                    onChange={e => setFormData({ ...formData, setName: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                                            <div className="mt-0.5">
                                                <FileText className="h-3 w-3 text-amber-600" />
                                            </div>
                                            <p className="text-[10px] text-amber-700 leading-tight">
                                                <strong>Note:</strong> Market price history won't be shown for items added manually as they are not linked to our database.
                                            </p>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsManualEntry(false);
                                                    setFormData({ ...formData, productName: undefined, setName: undefined });
                                                }}
                                                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                                            >
                                                Switch back to search
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {cards.length > 0 && !isManualEntry && (
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {cards.map(card => (
                                            <div
                                                key={card.id}
                                                onClick={() => {
                                                    if (category === "SEALED_PRODUCT") {
                                                        setFormData({
                                                            ...formData,
                                                            refPriceChartingProductId: card.id,
                                                            productName: card.name,
                                                            setName: card.set,
                                                            setCode: card.setCode
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            refPriceChartingProductId: card.id,
                                                            baseCardId: card.id,
                                                            cardVariantId: card.id,
                                                            setCode: card.setCode,
                                                            cardNumber: card.number
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 border rounded-xl cursor-pointer transition-all hover:border-primary/50",
                                                    (formData.refPriceChartingProductId === card.id || formData.baseCardId === card.id) ? "border-primary bg-primary/5" : "bg-card"
                                                )}
                                            >
                                                <img src={getOptimizedImageUrl(card.imageUrl, { height: 100 })} className="h-10 rounded-md shadow-lg" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs truncate">{card.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{card.set} {card.number ? `• ${card.number}` : ''}</p>
                                                </div>
                                                <div className="text-right shrink-0 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                                                    <p className="font-bold text-[11px] text-primary font-mono whitespace-nowrap">
                                                        ${Math.round((category === "SEALED_PRODUCT" ? card.sealedPrice : card.rawPrice) || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-tighter">Market Price</p>
                                                </div>
                                                {(formData.refPriceChartingProductId === card.id || formData.baseCardId === card.id) && <Check className="h-4 w-4 text-primary ml-2" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {category !== "SEALED_PRODUCT" ? (
                            <div className="space-y-6">

                                {formData.baseCardId && selectedCard && (
                                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-24 w-16 shrink-0 rounded-lg overflow-hidden border-2 border-primary/20 shadow-2xl">
                                                <img
                                                    src={getOptimizedImageUrl(selectedCard?.imageUrl, { height: 200 })}
                                                    className={cn(
                                                        "h-full w-full object-cover transition-all duration-500",
                                                        formData.variantType === "ALTERNATE_ART" && "hue-rotate-15 scale-110",
                                                        formData.variantType === "PARALLEL_FOIL" && "saturate-150 contrast-125 brightness-110"
                                                    )}
                                                    alt="Card Preview"
                                                />
                                                {formData.variantType !== "NORMAL" && (
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-lg font-bold tracking-tight">{selectedCard?.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{selectedCard?.set} • {selectedCard?.number || 'N/A'}</p>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-[8px] h-4 uppercase">{formData.variantType}</Badge>
                                                    <Badge variant="outline" className="text-[8px] h-4 uppercase">{formData.language}</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 italic">Variant Configuration</Label>
                                                <Select
                                                    value={formData.variantType}
                                                    onValueChange={v => setFormData({ ...formData, variantType: v as VariantType })}
                                                >
                                                    <SelectTrigger className="border-primary/20 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NORMAL">Standard Print</SelectItem>
                                                        <SelectItem value="ALTERNATE_ART">Alternate Art (Alt)</SelectItem>
                                                        <SelectItem value="PARALLEL_FOIL">Parallel / Foil</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 italic">Localization</Label>
                                                <Select
                                                    value={formData.language}
                                                    onValueChange={v => setFormData({ ...formData, language: v as Language })}
                                                >
                                                    <SelectTrigger className="border-primary/20 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="EN">English (EN)</SelectItem>
                                                        <SelectItem value="JP">Japanese (JP)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {category === "SINGLE_CARD_RAW" && (
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label>Professional Condition</Label>
                                            <Select
                                                value={formData.condition}
                                                onValueChange={v => setFormData({ ...formData, condition: v as Condition })}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select Grade..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NM">Near Mint (NM)</SelectItem>
                                                    <SelectItem value="LP">Lightly Played (LP)</SelectItem>
                                                    <SelectItem value="MP">Moderately Played (MP)</SelectItem>
                                                    <SelectItem value="HP">Heavily Played (HP)</SelectItem>
                                                    <SelectItem value="DMG">Damaged (DMG)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div />
                                    </div>
                                )}

                                {category === "SINGLE_CARD_GRADED" && (
                                    <div className="space-y-6">
                                        <div className="space-y-4 p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-wider">Grader</Label>
                                                <RadioGroup
                                                    value={formData.gradeProvider}
                                                    onValueChange={v => setFormData({ ...formData, gradeProvider: v as GradingCompany, grade: undefined, gradeValue: undefined })}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="PSA" id="psa" />
                                                        <Label htmlFor="psa" className="cursor-pointer">PSA</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="BGS" id="bgs" />
                                                        <Label htmlFor="bgs" className="cursor-pointer">BGS</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {formData.gradeProvider && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Grade</Label>
                                                    <RadioGroup
                                                        value={formData.grade}
                                                        onValueChange={v => {
                                                            const gradeValue = parseFloat(v.replace(/[^\d.]/g, ''));
                                                            setFormData({ ...formData, grade: v, gradeValue });
                                                        }}
                                                        className="flex flex-wrap gap-2"
                                                    >
                                                        {formData.gradeProvider === "PSA" ? (
                                                            <>
                                                                {["PSA 10", "PSA 9", "PSA 8"].map((g) => (
                                                                    <div key={g} className="flex items-center space-x-2">
                                                                        <RadioGroupItem value={g} id={g} />
                                                                        <Label htmlFor={g} className="cursor-pointer">{g}</Label>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {["BGS 10", "BGS 9.5"].map((g) => (
                                                                    <div key={g} className="flex items-center space-x-2">
                                                                        <RadioGroupItem value={g} id={g} />
                                                                        <Label htmlFor={g} className="cursor-pointer">{g}</Label>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </RadioGroup>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-wider">Certification Number (Optional)</Label>
                                                <Input
                                                    placeholder="e.g. 112983707"
                                                    className="h-12 font-mono text-lg border-primary/20"
                                                    value={formData.certNumber || ""}
                                                    onChange={e => setFormData({ ...formData, certNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-card flex items-center gap-2 shadow-sm">
                                            <BadgeCheck className="h-5 w-5 text-primary" />
                                            <span className="text-xs text-primary/80">Graded slabs are non-fungible. Quantity is locked to 1.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-sm">
                                    <span className="text-xs font-bold text-primary flex items-center mb-2">QUICK PRESETS:</span>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => applySealedPreset("ILLUSTRATION_BOX")}>Illustration Box</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => applySealedPreset("MINI_TIN")}>Mini Tin</Button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Product Name</Label>
                                        <Input
                                            placeholder="e.g. Romance Dawn Booster Box"
                                            value={formData.productName || ""}
                                            onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Product Category</Label>
                                        <Select
                                            value={formData.productType}
                                            onValueChange={v => setFormData({ ...formData, productType: v as ProductType })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BOOSTER_BOX">Booster Box</SelectItem>
                                                <SelectItem value="BOOSTER_PACK">Booster Pack</SelectItem>
                                                <SelectItem value="STARTER_DECK">Starter Deck</SelectItem>
                                                <SelectItem value="ILLUSTRATION_BOX">Illustration Box</SelectItem>
                                                <SelectItem value="MINI_TIN">Mini Tin</SelectItem>
                                                <SelectItem value="PREMIUM_BOX">Premium Box</SelectItem>
                                                <SelectItem value="BUNDLE">Bundle</SelectItem>
                                                <SelectItem value="CASE">Master Case</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label>Sealed Integrity</Label>
                                        <Select
                                            value={formData.integrity}
                                            onValueChange={v => setFormData({ ...formData, integrity: v as SealedIntegrity })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MINT">Mint Sealed</SelectItem>
                                                <SelectItem value="MINOR_DENTS">Minor Dents / Tears</SelectItem>
                                                <SelectItem value="DAMAGED">Damaged Seal</SelectItem>
                                                <SelectItem value="OPENED">Opened (Incomplete)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div />
                                </div>

                                <div className="p-5 border border-border/60 rounded-xl bg-card shadow-sm space-y-4">
                                    <h4 className="text-sm font-bold flex items-center gap-2"><Box className="h-4 w-4" /> Configuration Details</h4>
                                    <div className="flex flex-wrap gap-6">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="boosters"
                                                checked={formData.configuration.containsBoosters}
                                                onChange={e => setFormData({ ...formData, configuration: { ...formData.configuration, containsBoosters: e.target.checked } })}
                                                className="rounded border-primary"
                                            />
                                            <Label htmlFor="boosters" className="text-xs cursor-pointer">Contains Boosters</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="promo"
                                                checked={formData.configuration.containsPromo}
                                                onChange={e => setFormData({ ...formData, configuration: { ...formData.configuration, containsPromo: e.target.checked } })}
                                                className="rounded border-primary"
                                            />
                                            <Label htmlFor="promo" className="text-xs cursor-pointer">Contains Promo</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="fixed"
                                                checked={formData.configuration.containsFixedCards}
                                                onChange={e => setFormData({ ...formData, configuration: { ...formData.configuration, containsFixedCards: e.target.checked } })}
                                                className="rounded border-primary"
                                            />
                                            <Label htmlFor="fixed" className="text-xs cursor-pointer">Fixed Cards</Label>
                                        </div>
                                    </div>
                                    {formData.configuration.containsBoosters && (
                                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-[10px] text-muted-foreground uppercase">Packs per Unit</Label>
                                            <Input
                                                type="number"
                                                className="h-8 w-24"
                                                value={formData.configuration.packsPerUnit || ""}
                                                onChange={e => setFormData({ ...formData, configuration: { ...formData.configuration, packsPerUnit: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-6 pt-4 border-t">
                            <div className="space-y-2">
                                <Label>Acquisition Price ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.acquisitionPrice || ""}
                                    onChange={e => setFormData({ ...formData, acquisitionPrice: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Acquisition Date</Label>
                                <Input
                                    type="date"
                                    max={new Date().toISOString().split("T")[0]}
                                    value={formData.acquisitionDate}
                                    onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Workflow Stage</Label>
                                <Select
                                    value={formData.statusId}
                                    onValueChange={v => {
                                        const selectedStatus = statuses.find(s => s.id === v);
                                        setFormData({ 
                                            ...formData, 
                                            statusId: v, 
                                            stage: (selectedStatus?.systemId as any) || formData.stage 
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {statuses.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <div className={cn("flex items-center gap-2", !s.showOnKanban && "opacity-50 italic")}>
                                                    <div 
                                                        className={cn("w-2 h-2 rounded-full", !s.showOnKanban && "grayscale border border-muted-foreground/30")} 
                                                        style={{ backgroundColor: s.color || '#94a3b8' }} 
                                                    />
                                                    <span>{s.name}</span>
                                                    {!s.showOnKanban && (
                                                        <span className="text-[9px] font-normal text-muted-foreground/60 ml-auto">(Hidden)</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.stage === "LISTED" && (
                                <>
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Listing Price ($)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="border-primary/50"
                                            value={formData.listingPrice || ""}
                                            onChange={e => setFormData({ ...formData, listingPrice: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Public Description (Optional)</Label>
                                        <Input
                                            placeholder="e.g. Mint condition PSA 10..."
                                            value={formData.sellingDescription || ""}
                                            onChange={e => setFormData({ ...formData, sellingDescription: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-between bg-card/50">
                        <Button variant="outline" onClick={() => setStep(1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Type Selection
                        </Button>
                        <Button
                            onClick={() => setStep(3)}
                            disabled={
                                (category !== "SEALED_PRODUCT" && !isManualEntry && (!formData.baseCardId || !formData.variantType || !formData.language)) ||
                                (category !== "SEALED_PRODUCT" && isManualEntry && !formData.productName) ||
                                (category === "SINGLE_CARD_GRADED" && (!formData.gradeProvider || !formData.grade))
                            }
                        >
                            Next: Media Assets
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 3 && (
                <Card className="border-primary/20 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Step 3: Asset Documentation</CardTitle>
                        <CardDescription>Upload high-resolution scans or photos for listing verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className={cn("grid grid-cols-2 gap-4", category === "SINGLE_CARD_GRADED" ? "md:grid-cols-4" : "md:grid-cols-2")}>
                            {(category === "SINGLE_CARD_GRADED"
                                ? ["Front Face", "Back Face", "Cert Corner", "Seal Proof"]
                                : ["Front Face", "Back Face"]
                            ).map((label, idx) => (
                                <div
                                    key={label}
                                    className="relative group border-2 border-dashed border-primary/20 rounded-2xl aspect-square flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all overflow-hidden"
                                    onClick={() => document.getElementById(`file-upload-${idx}`)?.click()}
                                >
                                    {uploadingPhotos[label] ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    ) : uploadedPhotos[idx] ? (
                                        <img src={getOptimizedImageUrl(uploadedPhotos[idx], { height: 400 })} className="absolute inset-0 w-full h-full object-cover" alt={label} />
                                    ) : (
                                        <>
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <PackageIcon className="h-5 w-5 text-primary opacity-60" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id={`file-upload-${idx}`}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setUploadingPhotos(prev => ({ ...prev, [label]: true }));
                                            try {
                                                const { url } = await uploadFile(file);
                                                const newPhotos = [...uploadedPhotos];
                                                newPhotos[idx] = url;
                                                setUploadedPhotos(newPhotos);
                                                toast.success(`${label} uploaded`);
                                            } catch (error) {
                                                toast.error(`Failed to upload ${label}`);
                                            } finally {
                                                setUploadingPhotos(prev => ({ ...prev, [label]: false }));
                                                e.target.value = ""; // Reset input value
                                            }
                                        }}
                                    />
                                    {uploadedPhotos[idx] && (
                                        <>
                                            <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center text-white backdrop-blur-sm z-10">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <button
                                                className="absolute bottom-2 right-2 h-7 w-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive backdrop-blur-sm transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const urlToRemove = uploadedPhotos[idx];
                                                    if (urlToRemove) {
                                                        deleteFile(urlToRemove).catch(err => console.error("Failed to delete from server", err));
                                                        const newPhotos = [...uploadedPhotos];
                                                        newPhotos[idx] = "";
                                                        setUploadedPhotos(newPhotos);
                                                        toast.success(`${label} removed`);
                                                    }
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        {uploadedPhotos.filter(Boolean).length > 0 && (
                            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                <p className="text-xs text-primary font-bold">
                                    ASSETS ATTACHED SUCCESSFULLY
                                </p>
                                <p className="text-[10px] text-primary/60">
                                    Total {uploadedPhotos.filter(Boolean).length} assets uploaded.
                                </p>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-6 border-t flex justify-between bg-card/50">
                        <Button variant="outline" onClick={() => setStep(2)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Details
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold">
                            {loading ? "COMMITTING..." : "SAVE TO INVENTORY"}
                            <Check className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}

function TypeCard({ title, description, icon, selected, onClick }: { title: string, description: string, icon: React.ReactNode, selected: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative group cursor-pointer p-6 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02]",
                selected
                    ? "border-primary bg-primary/10 shadow-2xl shadow-primary/15 ring-1 ring-primary/50"
                    : "border-border bg-card/50 hover:border-primary/30"
            )}
        >
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            {selected && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg animate-in zoom-in-50">
                    <Check className="h-4 w-4" />
                </div>
            )}
        </div>
    );
}
