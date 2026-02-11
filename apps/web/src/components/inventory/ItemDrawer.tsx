"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InventoryItem, CardProfile, InventoryStage } from "@/lib/types";
import { Trash2, Save, ExternalLink } from "lucide-react";
import { updateInventoryItem, deleteInventoryItem } from "@/lib/api";
import { toast } from "sonner";

interface ItemDrawerProps {
    item: InventoryItem | null;
    profile?: CardProfile;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void | Promise<void>;
}

const STAGES: { value: InventoryStage; label: string }[] = [
    { value: "ACQUIRED", label: "Acquired" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "BEING_GRADED", label: "Being Graded" },
    { value: "IN_STOCK", label: "In Stock" },
    { value: "LISTED", label: "Listed" },
    { value: "SOLD", label: "Sold" },
];

export function ItemDrawer({ item, profile, isOpen, onClose, onUpdate }: ItemDrawerProps) {
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData(item);
        }
    }, [item]);

    const handleSave = async () => {
        if (!item) return;
        setLoading(true);
        try {
            // Remove fields that the backend doesn't allow in the update DTO
            const {
                id,
                userId,
                createdAt,
                updatedAt,
                type,
                itemType,
                cardProfile,
                marketPriceSnapshot,
                marketPrice,
                // These are frontend-only or mismatch fields
                gradingCompany,
                grade,
                certificationNumber,
                gradingMeta,
                previousCertNumbers,
                ...patchData
            } = formData as any;

            await updateInventoryItem(item.id, patchData);
            toast.success("Item updated");
            onUpdate();
            onClose();
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

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md overflow-y-auto bg-card/95 backdrop-blur-xl border-l-primary/10 p-10">
                <SheetHeader className="px-0">
                    <SheetTitle className="font-bold text-xl tracking-tight">{displayName || "Asset Details"}</SheetTitle>
                    <SheetDescription className="font-mono text-[10px] uppercase opacity-70">
                        {finalProfile?.set} — {typeLabel}
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    <div className="flex justify-center bg-accent/20 rounded-2xl p-6 border border-primary/5">
                        <img
                            src={finalProfile?.imageUrl || `https://placehold.co/200x300?text=${isSealed ? 'Sealed' : 'Card'}`}
                            alt={displayName}
                            className="h-64 rounded-xl shadow-2xl object-contain"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Workflow State</Label>
                            <Select
                                value={formData.stage}
                                onValueChange={(v) => setFormData({ ...formData, stage: v as InventoryStage })}
                            >
                                <SelectTrigger className="h-12 bg-background/50 border-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAGES.map(s => (
                                        <SelectItem key={s.value} value={s.value} className="text-sm font-bold">{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Acquisition ($)</Label>
                                <Input
                                    type="number"
                                    className="h-12 bg-background/50 border-primary/20"
                                    value={formData.acquisitionPrice || ""}
                                    onChange={e => setFormData({ ...formData, acquisitionPrice: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Inventory Qty</Label>
                                <Input
                                    type="number"
                                    disabled={itType === "SINGLE_CARD_GRADED"}
                                    className="h-12 bg-background/50 border-primary/20"
                                    value={(formData as any).quantity || 1}
                                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) } as any)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-primary/20 rounded-2xl bg-primary/5">
                            <div className="space-y-0.5">
                                <Label className="font-bold">List for Sale</Label>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Move to 'LISTED' stage</p>
                            </div>
                            <Switch
                                checked={formData.stage === "LISTED"}
                                onCheckedChange={(v) => {
                                    setFormData({ ...formData, stage: v ? "LISTED" : "IN_STOCK" });
                                }}
                            />
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-8 flex flex-col gap-3 px-0">
                    <Button className="w-full h-12 text-md font-bold shadow-[0_0_20px] shadow-primary/30" onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-5 w-5" />
                        Save Asset Changes
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-12 text-sm font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={async () => {
                            if (!item) return;
                            if (window.confirm("Are you sure you want to remove this asset from your portfolio?")) {
                                setLoading(true);
                                try {
                                    console.log(`Attempting to delete item: ${item.id}`);
                                    await deleteInventoryItem(item.id);
                                    toast.success("Asset removed from portfolio");
                                    await onUpdate();
                                    onClose();
                                } catch (err: any) {
                                    console.error("Delete failed:", err);
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
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
