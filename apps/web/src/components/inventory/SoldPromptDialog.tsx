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
import { Label } from "@/components/ui/label";
import { DollarSign, Calendar, Loader2 } from "lucide-react";

interface SoldPromptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { soldPrice: number; soldDate: string }) => Promise<void>;
    itemName?: string;
}

export function SoldPromptDialog({ isOpen, onClose, onConfirm, itemName }: SoldPromptDialogProps) {
    const [soldPrice, setSoldPrice] = useState<string>("");
    const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        const price = parseFloat(soldPrice);
        if (isNaN(price)) return;
        
        setLoading(true);
        try {
            await onConfirm({ soldPrice: price, soldDate });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Mark as Sold</DialogTitle>
                    <DialogDescription className="text-sm opacity-70">
                        {itemName ? `Enter final sale details for ${itemName}` : "Enter final sale details for this item."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Sale Price ($)
                        </Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="h-12 bg-background/50 border-primary/10 font-bold text-lg"
                            value={soldPrice}
                            onChange={(e) => setSoldPrice(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Date Sold
                        </Label>
                        <Input
                            type="date"
                            className="h-12 bg-background/50 border-primary/10"
                            max={new Date().toISOString().split('T')[0]}
                            value={soldDate}
                            onChange={(e) => setSoldDate(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="font-semibold text-xs">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || !soldPrice}
                        className="font-bold text-xs px-8 shadow-[0_0_15px] shadow-primary/20"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
