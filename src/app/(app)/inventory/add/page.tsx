"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mockApi } from "@/lib/mockApi";
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
    Language
} from "@/lib/types";
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
import { toast } from "sonner";
import { Search, ChevronRight, ChevronLeft, Check, Package as PackageIcon, FileText, BadgeCheck, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InventoryCategory = "SINGLE_CARD_RAW" | "SINGLE_CARD_GRADED" | "SEALED_PRODUCT";

export default function AddItemPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<InventoryCategory | null>(null);
    const [cards, setCards] = useState<CardProfile[]>([]);
    const [search, setSearch] = useState("");

    // Unified Form State
    const [formData, setFormData] = useState<any>({
        acquisitionPrice: 0,
        acquisitionDate: new Date().toISOString().split("T")[0],
        stage: "ACQUIRED" as InventoryStage,
        quantity: 1,
        variantType: "NORMAL" as VariantType,
        language: "EN" as Language,
        configuration: {
            containsBoosters: false,
            containsFixedCards: false,
            containsPromo: false
        }
    });

    useEffect(() => {
        if (search.length > 0) {
            mockApi.listCardProfiles(search).then(setCards);
        }
    }, [search]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Determine the final cardVariantId if it's a card
            let finalCardVariantId = formData.cardVariantId;
            if (category !== "SEALED_PRODUCT") {
                // In a real app, we would resolve/create a CardVariant record here
                // For the mock, we simulate a unique ID based on the selection
                finalCardVariantId = `${formData.baseCardId}-${formData.variantType}-${formData.language}`;
            }

            const itemToSave = {
                ...formData,
                cardVariantId: finalCardVariantId,
                type: category,
                createdAt: new Date().toISOString()
            };
            await mockApi.createInventoryItem(itemToSave as any);
            toast.success("Item added to inventory");
            router.push("/inventory");
        } catch (err) {
            toast.error("Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    const selectedCard = cards.find(c => c.id === formData.cardVariantId);

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
                                step >= s ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-accent"
                            )}
                        />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TypeCard
                        title="Raw Card"
                        description="Fungible single cards by condition."
                        icon={<FileText className="h-8 w-8 text-blue-500" />}
                        selected={category === "SINGLE_CARD_RAW"}
                        onClick={() => {
                            setCategory("SINGLE_CARD_RAW");
                            setFormData({ ...formData, quantity: 1, type: "SINGLE_CARD_RAW" });
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
                            setStep(2);
                        }}
                    />
                </div>
            )}

            {step === 2 && (
                <Card className="border-primary/20 bg-background/50 backdrop-blur-xl">
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
                        {category !== "SEALED_PRODUCT" ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Search Card Model</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Pikachu, Luffy, Charizard..."
                                            className="pl-9"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {cards.map(card => (
                                            <div
                                                key={card.id}
                                                onClick={() => setFormData({ ...formData, baseCardId: card.id, cardVariantId: card.id })}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 border rounded-xl cursor-pointer transition-all hover:border-primary/50",
                                                    formData.baseCardId === card.id ? "border-primary bg-primary/10" : "bg-accent/20"
                                                )}
                                            >
                                                <img src={card.imageUrl} className="h-10 rounded-md shadow-lg" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs truncate">{card.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{card.set} • {card.cardNumber}</p>
                                                </div>
                                                {formData.baseCardId === card.id && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {formData.baseCardId && (
                                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-6 animate-in fade-in slide-in-from-top-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-24 w-16 shrink-0 rounded-lg overflow-hidden border-2 border-primary/20 shadow-2xl">
                                                <img
                                                    src={selectedCard?.imageUrl}
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
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{selectedCard?.set} • {selectedCard?.cardNumber}</p>
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
                                                    <SelectTrigger className="bg-background/50 border-primary/20 h-10">
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
                                                    <SelectTrigger className="bg-background/50 border-primary/20 h-10">
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
                                    <div className="grid grid-cols-2 gap-6">
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
                                    </div>
                                )}

                                {category === "SINGLE_CARD_GRADED" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Authority</Label>
                                                <Select
                                                    value={formData.gradingCompany}
                                                    onValueChange={v => setFormData({ ...formData, gradingCompany: v as GradingCompany })}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PSA">PSA</SelectItem>
                                                        <SelectItem value="BGS">BGS</SelectItem>
                                                        <SelectItem value="CGC">CGC</SelectItem>
                                                        <SelectItem value="ARS">ARS</SelectItem>
                                                        <SelectItem value="SGC">SGC</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 text-primary font-mono">
                                                <Label>Grade/Score</Label>
                                                <Input
                                                    placeholder="10 / 9.5"
                                                    value={formData.grade || ""}
                                                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Certification #</Label>
                                                <Input
                                                    placeholder="00000000"
                                                    className="font-mono"
                                                    value={formData.certNumber || ""}
                                                    onChange={e => setFormData({ ...formData, certNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5 flex items-center gap-2">
                                            <BadgeCheck className="h-5 w-5 text-primary" />
                                            <span className="text-xs text-primary/80">Graded slabs are non-fungible. Quantity is locked to 1.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
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

                                <div className="grid grid-cols-2 gap-6">
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
                                </div>

                                <div className="p-5 border rounded-xl bg-accent/20 space-y-4">
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

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t">
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
                                <Label>Current Workflow Stage</Label>
                                <Select
                                    value={formData.stage}
                                    onValueChange={v => setFormData({ ...formData, stage: v as InventoryStage })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACQUIRED">Acquired</SelectItem>
                                        <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                        <SelectItem value="BEING_GRADED">Grading In-Progress</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-between bg-accent/10">
                        <Button variant="outline" onClick={() => setStep(1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Type Selection
                        </Button>
                        <Button onClick={() => setStep(3)} disabled={category !== "SEALED_PRODUCT" && (!formData.baseCardId || !formData.variantType || !formData.language)}>
                            Next: Media Assets
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 3 && (
                <Card className="border-primary/20 bg-background/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle>Step 3: Asset Documentation</CardTitle>
                        <CardDescription>Upload high-resolution scans or photos for listing verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {["Front Face", "Back Face", "Cert Corner", "Seal Proof"].map(label => (
                                <div key={label} className="group border-2 border-dashed border-primary/20 rounded-2xl aspect-square flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <PackageIcon className="h-5 w-5 text-primary opacity-60" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                            <p className="text-xs text-primary font-bold">
                                PROFESSIONAL SCANNING ACTIVE
                            </p>
                            <p className="text-[10px] text-primary/60">
                                AI will automatically extract Cert Number and Grade from images.
                            </p>
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-between bg-accent/10">
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
                    ? "border-primary bg-primary/10 shadow-[0_20px_40px_rgba(var(--primary),0.15)] ring-1 ring-primary/50"
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
