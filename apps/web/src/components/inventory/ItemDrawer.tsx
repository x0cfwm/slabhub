"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InventoryItem, CardProfile, InventoryStage, GradingCompany, Condition, InventoryStatus } from "@/lib/types";
import { Trash2, Save, Info, ShoppingCart, Award, Calendar, DollarSign, StickyNote, Layers, Plus, Loader2, Check, ArrowLeft, Maximize2, X } from "lucide-react";
import { updateInventoryItem, deleteInventoryItem, uploadFile, deleteFile } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image-utils";

interface ItemDrawerProps {
    item: InventoryItem | null;
    profile?: CardProfile;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void | Promise<void>;
    statuses: InventoryStatus[];
}

const STAGES: { value: InventoryStage; label: string }[] = [
    { value: "ACQUIRED", label: "Acquired" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "BEING_GRADED", label: "Being Graded" },
    { value: "IN_STOCK", label: "In Stock" },
    { value: "LISTED", label: "Listed" },
    { value: "SOLD", label: "Sold" },
];

const GRADING_COMPANIES: GradingCompany[] = ["BGS", "PSA", "OTHER"];
const CONDITIONS: { value: Condition; label: string }[] = [
    { value: "NM", label: "Near Mint" },
    { value: "LP", label: "Lightly Played" },
    { value: "MP", label: "Moderately Played" },
    { value: "HP", label: "Heavily Played" },
    { value: "DMG", label: "Damaged" },
];

export function ItemDrawer({ item, profile, isOpen, onClose, onUpdate, statuses }: ItemDrawerProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [loading, setLoading] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Get active tab from URL or default to "basic"
    const activeTab = searchParams.get("tab") || "basic";

    useEffect(() => {
        if (item) {
            setFormData(item);
        }
    }, [item]);

    // Helpers for images
    const photos = (formData.photos as string[]) || [];

    const setTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleSave = async () => {
        if (!item) return;

        const today = new Date().toISOString().split("T")[0];
        const acqDate = formData.acquisitionDate ? new Date(formData.acquisitionDate).toISOString().split('T')[0] : "";
        if (acqDate && acqDate > today) {
            toast.error("Acquisition date cannot be in the future");
            return;
        }

        setLoading(true);
        try {
            // Remove fields that the backend doesn't allow in the update DTO
            const {
                id,
                userId,
                createdAt,
                updatedAt,
                type,
                cardProfile,
                marketPriceSnapshot,
                marketPrice,
                frontMediaUrl,
                backMediaUrl,
                // Exclude transformed fields that are not in the backend DTO
                gradingCompany,
                grade,
                gradingMeta,
                previousCertNumbers,
                // These are fields that might need special handling or are currently not supported by backend
                ...patchData
            } = formData as any;

            await updateInventoryItem(item.id, patchData);
            toast.success("Item updated");
            await onUpdate();
        } catch (err) {
            console.error("Update failed:", err);
            toast.error("Failed to update item");
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
    const finalProfile = profile || item.cardProfile;
    const isSealed = itType === "SEALED_PRODUCT" || (itType === "SEALED");
    const displayName = isSealed ? (item as any).productName || finalProfile?.name : finalProfile?.name;
    const typeLabel = itType.replace("SINGLE_CARD_", "").replace("_PRODUCT", "");

    const imageSlots = (itType === "SINGLE_CARD_GRADED" || (formData as any).itemType === "SINGLE_CARD_GRADED")
        ? ["Front Face", "Back Face", "Cert Corner", "Seal Proof"]
        : ["Front Face", "Back Face"];

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl bg-card/95 backdrop-blur-xl border-l-primary/10 p-0 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 pb-0">
                    <SheetHeader className="px-0 mb-4 border-b border-primary/5 pb-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                            <div
                                className="w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden border bg-muted/30 shadow-md ring-1 ring-primary/5 relative group cursor-zoom-in"
                                onClick={() => setZoomedImage(photos[0] || finalProfile?.imageUrl || null)}
                            >
                                <img
                                    src={getOptimizedImageUrl(photos[0] || finalProfile?.imageUrl || `https://placehold.co/200x300?text=${isSealed ? 'Sealed' : 'Card'}`, { height: 300 })}
                                    alt={displayName}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <SheetTitle className="font-bold text-2xl tracking-tight leading-tight">{displayName || "Asset Details"}</SheetTitle>
                                <SheetDescription className="font-mono text-[10px] uppercase opacity-70 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <span className="px-1.5 py-0.5 bg-primary/10 rounded text-primary border border-primary/20">{typeLabel}</span>
                                    {finalProfile?.set} {finalProfile?.cardNumber && `— #${finalProfile.cardNumber}`}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="mt-4">
                        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="basic" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs px-2">
                                    <Info className="h-3.5 w-3.5" />
                                    <span>Basic</span>
                                </TabsTrigger>
                                <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs px-2">
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>Images</span>
                                </TabsTrigger>
                                <TabsTrigger value="shop" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs px-2">
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    <span>Shop</span>
                                </TabsTrigger>
                                <TabsTrigger value="grading" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs px-2">
                                    <Award className="h-3.5 w-3.5" />
                                    <span>Grading</span>
                                </TabsTrigger>
                            </TabsList>

                            <div className="py-4 min-h-[500px]">
                                <TabsContent value="basic" className="space-y-6 mt-0">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Workflow State</Label>
                                            <Select
                                                value={formData.statusId || ""}
                                                onValueChange={(v) => {
                                                    const selectedStatus = statuses.find(s => s.id === v);
                                                    setFormData({
                                                        ...formData,
                                                        statusId: v,
                                                        // Fallback stage for backward compatibility if needed by some UI
                                                        stage: selectedStatus?.name.toUpperCase().replace(/\s+/g, '_') as any
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="h-11 bg-background/50 border-primary/10 focus:ring-primary/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map(s => (
                                                        <SelectItem key={s.id} value={s.id} className="text-sm font-semibold">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: s.color || '#94a3b8' }}
                                                                />
                                                                {s.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" /> Acquisition Price ($)
                                            </Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                className="h-11 bg-background/50 border-primary/10"
                                                value={formData.acquisitionPrice || ""}
                                                onChange={e => setFormData({ ...formData, acquisitionPrice: parseFloat(e.target.value) })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> Date Acquired
                                            </Label>
                                            <Input
                                                type="date"
                                                className="h-11 bg-background/50 border-primary/10"
                                                max={new Date().toISOString().split('T')[0]}
                                                value={formData.acquisitionDate ? new Date(formData.acquisitionDate).toISOString().split('T')[0] : ""}
                                                onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                                                <Layers className="h-3 w-3" /> Quantity
                                            </Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="h-11 bg-background/50 border-primary/10"
                                                value={formData.quantity || 1}
                                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) } as any)}
                                                disabled={itType === "SINGLE_CARD_GRADED"}
                                            />
                                        </div>

                                        {!isSealed && (formData as any).itemType === "SINGLE_CARD_RAW" && (
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Condition</Label>
                                                <Select
                                                    value={(formData as any).condition}
                                                    onValueChange={(v) => setFormData({ ...formData, condition: v as Condition } as any)}
                                                >
                                                    <SelectTrigger className="h-11 bg-background/50 border-primary/10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CONDITIONS.map(c => (
                                                            <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                                                <StickyNote className="h-3 w-3" /> Private Notes
                                            </Label>
                                            <Textarea
                                                placeholder="Internal notes about this acquisition..."
                                                className="min-h-[80px] bg-background/50 border-primary/10 resize-none"
                                                value={formData.notes || ""}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>

                                        {!((item as any).cardVariantId || item.refPriceChartingProductId) && (
                                            <div className="space-y-4 col-span-2 pt-4 border-t border-primary/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Info className="h-3 w-3 text-primary" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Non-Database Asset</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Manual Item Name</Label>
                                                        <Input
                                                            className="h-11 bg-background/50 border-primary/10"
                                                            value={formData.productName || ""}
                                                            onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Manual Set Name</Label>
                                                        <Input
                                                            className="h-11 bg-background/50 border-primary/10"
                                                            value={formData.setName || ""}
                                                            onChange={e => setFormData({ ...formData, setName: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                    This item is not linked to our price database. Modifying these fields will only update the display name.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="images" className="space-y-6 mt-0">
                                    <div className={cn(
                                        "grid gap-4",
                                        imageSlots.length > 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
                                    )}>
                                        {imageSlots.map((label, idx) => (
                                            <div
                                                key={label}
                                                className="relative group border-2 border-dashed border-primary/20 rounded-2xl aspect-square flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all overflow-hidden"
                                                onClick={() => document.getElementById(`file-upload-drawer-${idx}`)?.click()}
                                            >
                                                {uploadingPhotos[label] ? (
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                ) : (formData as any).photos?.[idx] ? (
                                                    <div className="absolute inset-0 w-full h-full group/img">
                                                        <img src={getOptimizedImageUrl((formData as any).photos[idx], { width: 300, height: 300, fit: 'cover' })} className="w-full h-full object-cover" alt={label} />
                                                        <div
                                                            className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setZoomedImage((formData as any).photos[idx]);
                                                            }}
                                                        >
                                                            <Maximize2 className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                            <Plus className="h-5 w-5 text-primary opacity-60" />
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">{label}</span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    id={`file-upload-drawer-${idx}`}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        setUploadingPhotos(prev => ({ ...prev, [label]: true }));
                                                        try {
                                                            const { url } = await uploadFile(file);
                                                            const currentPhotos = (formData as any).photos || [];
                                                            const newPhotos = [...currentPhotos];
                                                            // Pad with empty strings if needed
                                                            while (newPhotos.length < idx) newPhotos.push("");
                                                            newPhotos[idx] = url;
                                                            setFormData({ ...formData, photos: newPhotos } as any);
                                                            toast.success(`${label} uploaded`);
                                                        } catch (error) {
                                                            toast.error(`Failed to upload ${label}`);
                                                        } finally {
                                                            setUploadingPhotos(prev => ({ ...prev, [label]: false }));
                                                            e.target.value = ""; // Reset input value
                                                        }
                                                    }}
                                                />
                                                {(formData as any).photos?.[idx] && (
                                                    <>
                                                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center text-white backdrop-blur-sm z-10 shadow-lg shadow-black/20">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <button
                                                            className="absolute bottom-2 right-2 h-7 w-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive backdrop-blur-sm transition-all z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const urlToRemove = (formData as any).photos[idx];
                                                                if (urlToRemove) {
                                                                    deleteFile(urlToRemove).catch((err: any) => console.error("Failed to delete from server", err));
                                                                    const currentPhotos = (formData as any).photos || [];
                                                                    const newPhotos = [...currentPhotos];
                                                                    newPhotos[idx] = "";
                                                                    setFormData({ ...formData, photos: newPhotos } as any);
                                                                    toast.success(`${label} removed`);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <Layers className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">Documentation Standards</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                For best results, use a high-resolution scanner or a neutral background with direct lighting.
                                                Clear photos significantly increase buyer trust.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="shop" className="space-y-6 mt-0">
                                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base font-bold">List for Sale</Label>
                                                <p className="text-xs text-muted-foreground">Make this item visible in your public shop</p>
                                            </div>
                                            <Switch
                                                checked={formData.stage === "LISTED"}
                                                onCheckedChange={(v) => {
                                                    setFormData({ ...formData, stage: v ? "LISTED" : "IN_STOCK" });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className={cn("space-y-6 transition-all duration-300", formData.stage !== "LISTED" && "opacity-50 pointer-events-none grayscale")}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Listing Price ($)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="h-11 bg-background/50 border-primary/10 font-bold text-lg"
                                                    value={formData.listingPrice || ""}
                                                    onChange={e => setFormData({ ...formData, listingPrice: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Market Price ($)</Label>
                                                <div className="h-11 bg-muted/30 border border-primary/5 rounded-md flex items-center px-3 font-mono text-sm opacity-80">
                                                    {formData.marketPrice ? Math.round(formData.marketPrice).toLocaleString() : "—"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Public Description</Label>
                                            <Textarea
                                                placeholder="Tell buyers about the condition, shipping, or any other details..."
                                                className="min-h-[150px] bg-background/50 border-primary/10"
                                                value={formData.sellingDescription || ""}
                                                onChange={e => setFormData({ ...formData, sellingDescription: e.target.value })}
                                            />
                                        </div>

                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                                            <Info className="h-5 w-5 text-amber-500 shrink-0" />
                                            <p className="text-xs text-amber-700/80 leading-relaxed">
                                                When listed, this item will be discoverable by other users on the Slabhub marketplace.
                                                Ensure your description accurately reflects the item's condition.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="grading" className="space-y-6 mt-0">
                                    {((formData as any).itemType === "SINGLE_CARD_GRADED" || (formData as any).type === "SINGLE_CARD_GRADED") ? (
                                        <div className="space-y-6">
                                            {(item as any).type === "SINGLE_CARD_RAW" && (
                                                <div className="flex items-center justify-between bg-primary/5 rounded-xl p-3 border border-primary/10">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-primary">Conversion Pending</p>
                                                        <p className="text-[10px] text-muted-foreground italic">Save changes to finalize</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-[10px] font-bold gap-1.5 hover:bg-primary/10"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                itemType: "SINGLE_CARD_RAW" as any,
                                                                gradeProvider: undefined,
                                                                gradeValue: undefined,
                                                                certNumber: undefined,
                                                                quantity: 1
                                                            } as any);
                                                        }}
                                                    >
                                                        <ArrowLeft className="h-3.5 w-3.5" />
                                                        Return to Raw
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Grader</Label>
                                                    <RadioGroup
                                                        value={(formData as any).gradeProvider}
                                                        onValueChange={(v) => setFormData({ ...formData, gradeProvider: v as GradingCompany } as any)}
                                                        className="flex flex-wrap gap-6"
                                                    >
                                                        {GRADING_COMPANIES.map(comp => (
                                                            <div key={comp} className="flex items-center space-x-2">
                                                                <RadioGroupItem value={comp} id={`grader-${comp}`} />
                                                                <Label htmlFor={`grader-${comp}`} className="cursor-pointer text-sm font-bold">{comp}</Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                </div>

                                                {((formData as any).gradeProvider === "PSA" || (formData as any).gradeProvider === "BGS") && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider">Grade</Label>
                                                        <RadioGroup
                                                            value={(formData as any).gradeValue}
                                                            onValueChange={(v) => setFormData({ ...formData, gradeValue: v } as any)}
                                                            className="flex flex-wrap gap-6"
                                                        >
                                                            {((formData as any).gradeProvider === "PSA" ? ["10", "9", "8"] : ["10", "9.5", "9"]).map((g) => (
                                                                <div key={g} className="flex items-center space-x-2">
                                                                    <RadioGroupItem value={g} id={`grade-${g}`} />
                                                                    <Label htmlFor={`grade-${g}`} className="cursor-pointer text-sm font-bold">
                                                                        {(formData as any).gradeProvider} {g}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </RadioGroup>
                                                    </div>
                                                )}

                                                {/* Fallback for other graders or custom input */}
                                                {(formData as any).gradeProvider && !["PSA", "BGS"].includes((formData as any).gradeProvider) && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider">Grade</Label>
                                                        <Input
                                                            placeholder="e.g. 10"
                                                            className="h-11 bg-background/50 border-primary/20 font-bold"
                                                            value={(formData as any).gradeValue || ""}
                                                            onChange={e => setFormData({ ...formData, gradeValue: e.target.value } as any)}
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider">Certification Number (Optional)</Label>
                                                    <Input
                                                        placeholder="e.g. 112983707"
                                                        className="h-12 bg-background/50 border-primary/20 font-mono text-lg shadow-sm"
                                                        value={(formData as any).certNumber || ""}
                                                        onChange={e => setFormData({ ...formData, certNumber: e.target.value } as any)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border border-dashed border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-primary/5">
                                                <Layers className="h-8 w-8 text-primary/40" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm">Grading Images</p>
                                                    <p className="text-xs text-muted-foreground px-4">Grading proof images are available in the Images tab.</p>
                                                </div>
                                                {/** <Button variant="outline" size="sm" className="mt-2" disabled>Upload Scans (Soon)</Button> */}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-6 p-8">
                                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                                <Award className="h-10 w-10 text-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-bold text-xl">Ungraded Asset</h3>
                                                <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px]">
                                                    This item is currently tracked as a raw asset. Ready to professionaly grade it?
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="w-full h-14 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold group"
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        itemType: "SINGLE_CARD_GRADED" as any,
                                                        gradeProvider: "PSA" as any,
                                                        gradeValue: "10",
                                                        quantity: 1
                                                    } as any);
                                                }}
                                            >
                                                Convert to Graded Asset
                                                <Layers className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                                            </Button>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                                Once converted, you can add certification details
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>

                <div className="mt-auto border-t border-primary/10 bg-background/50 backdrop-blur-md p-4">
                    <SheetFooter className="flex flex-col gap-2 sm:flex-col">
                        <Button className="w-full h-11 text-md font-bold shadow-[0_0_20px] shadow-primary/20" onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                            <Save className="ml-2 h-4 w-4" />
                        </Button>
                        {activeTab === "basic" && (
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={async () => {
                                    if (!item) return;
                                    if (window.confirm("Are you sure you want to remove this asset from your portfolio?")) {
                                        setLoading(true);
                                        try {
                                            await deleteInventoryItem(item.id);
                                            toast.success("Asset removed from portfolio");
                                            await onUpdate();
                                            onClose();
                                        } catch (err: any) {
                                            toast.error(err.message || "Failed to delete asset");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                disabled={loading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove From Portfolio
                            </Button>
                        )}
                        {activeTab === "grading" && (item as any).type === "SINGLE_CARD_GRADED" && (
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={async () => {
                                    if (!item) return;
                                    if (window.confirm("Are you sure you want to revert this asset to Raw? Certification history will be lost.")) {
                                        setLoading(true);
                                        try {
                                            await updateInventoryItem(item.id, {
                                                itemType: "SINGLE_CARD_RAW",
                                                gradeProvider: null,
                                                gradeValue: null,
                                                certNumber: null,
                                                gradingCost: null,
                                                slabImages: {}
                                            });
                                            toast.success("Asset reverted to Raw");
                                            await onUpdate();
                                        } catch (err: any) {
                                            toast.error(err.message || "Failed to revert asset");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                disabled={loading}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Revert Asset to Raw
                            </Button>
                        )}
                    </SheetFooter>
                </div>
            </SheetContent>

            <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
                <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
                    <DialogTitle className="sr-only">Quick Look</DialogTitle>
                    <DialogDescription className="sr-only">Zoomed image view of the asset</DialogDescription>
                    {zoomedImage && (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img
                                src={getOptimizedImageUrl(zoomedImage, { height: 1200, fit: 'scale-down' })}
                                alt="Zoomed view"
                                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                            />
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute top-6 right-6 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border-white/10 text-white"
                                onClick={() => setZoomedImage(null)}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
