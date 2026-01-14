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
import { mockApi } from "@/lib/mockApi";
import { toast } from "sonner";

interface ItemDrawerProps {
    item: InventoryItem | null;
    profile?: CardProfile;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const STAGES: { value: InventoryStage; label: string }[] = [
    { value: "ACQUIRED", label: "Acquired" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "IN_STOCK_UNGRADED", label: "In Stock (Ungraded)" },
    { value: "BEING_GRADED", label: "Being Graded" },
    { value: "UNGRADED_FOR_SALE", label: "For Sale (Ungraded)" },
    { value: "GRADED_FOR_SALE", label: "For Sale (Graded)" },
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
            await mockApi.updateInventoryItem(item.id, formData);
            toast.success("Item updated");
            onUpdate();
            onClose();
        } catch (err) {
            toast.error("Failed to update item");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!item) return;
        if (!confirm("Are you sure you want to delete this item?")) return;

        setLoading(true);
        try {
            await mockApi.deleteInventoryItem(item.id);
            toast.success("Item deleted");
            onUpdate();
            onClose();
        } catch (err) {
            toast.error("Failed to delete item");
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{profile?.name || "Edit Item"}</SheetTitle>
                    <SheetDescription>{profile?.set} - {item.itemType}</SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    <div className="flex justify-center bg-accent/50 rounded-lg p-4">
                        <img
                            src={profile?.imageUrl}
                            alt={profile?.name}
                            className="h-48 rounded shadow-sm"
                        />
                    </div>

                    <div className="space-y-4 p-4">
                        <div className="space-y-2">
                            <Label>Current Stage</Label>
                            <Select
                                value={formData.stage}
                                onValueChange={(v) => setFormData({ ...formData, stage: v as InventoryStage })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAGES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Listing Price ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.listingPrice || ""}
                                    onChange={e => setFormData({ ...formData, listingPrice: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Acquisition Price ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.acquisitionPrice || ""}
                                    onChange={e => setFormData({ ...formData, acquisitionPrice: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Active Listing</Label>
                                <p className="text-xs text-muted-foreground">Is this item visible to buyers?</p>
                            </div>
                            <Switch
                                checked={formData.stage?.includes("FOR_SALE")}
                                onCheckedChange={(v) => {
                                    const newStage = v
                                        ? (item.itemType === "GRADED" ? "GRADED_FOR_SALE" : "UNGRADED_FOR_SALE")
                                        : "IN_STOCK_UNGRADED";
                                    setFormData({ ...formData, stage: newStage });
                                }}
                            />
                        </div>
                    </div>
                </div>

                <SheetFooter className="gap-2 sm:gap-0">

                    <Button className="flex-1" onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
