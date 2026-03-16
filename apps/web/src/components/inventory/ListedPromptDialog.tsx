"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign, MessageSquare, Loader2 } from "lucide-react";

interface ListedPromptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { listingPrice: number; sellingDescription: string }) => Promise<void>;
    itemName?: string;
    item?: any;
}

export function ListedPromptDialog({ isOpen, onClose, onConfirm, itemName, item }: ListedPromptDialogProps) {
    const defaultMarketPrice = item?.marketPrice ? String(item.marketPrice) : "";
    const [listingPrice, setListingPrice] = useState<string>(item?.listingPrice ? String(item.listingPrice) : defaultMarketPrice);
    const [sellingDescription, setSellingDescription] = useState<string>(item?.sellingDescription || "");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        const price = parseFloat(listingPrice);
        if (isNaN(price)) return;
        
        setLoading(true);
        try {
            await onConfirm({ listingPrice: price, sellingDescription });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">List Item for Sale</DialogTitle>
                    <DialogDescription className="text-sm opacity-70">
                        {itemName ? `Enter listing details for ${itemName}` : "Enter listing details for this item."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Listing Price ($)
                        </Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="h-12 bg-background/50 border-primary/10 font-bold text-lg"
                            value={listingPrice}
                            onChange={(e) => setListingPrice(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Public Description
                        </Label>
                        <Textarea
                            placeholder="Tell buyers about the condition, shipping, etc."
                            className="min-h-[100px] bg-background/50 border-primary/10 resize-none"
                            value={sellingDescription}
                            onChange={(e) => setSellingDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="font-semibold text-xs">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || !listingPrice}
                        className="font-bold text-xs px-8 shadow-[0_0_15px] shadow-primary/20"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Listing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
