"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InventoryItem, CardProfile, PricingSnapshot, InventoryStage } from "@/lib/types";
import { COLUMNS } from "./dnd";
import { mockApi } from "@/lib/mockApi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface InventoryListProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    cards: CardProfile[];
    pricing: PricingSnapshot[];
    onUpdate: () => void;
    onItemClick: (item: InventoryItem) => void;
}

export function InventoryList({ items, setItems, cards, pricing, onUpdate, onItemClick }: InventoryListProps) {
    const handleStageChange = async (itemId: string, newStage: InventoryStage) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const oldStage = item.stage;

        // Optimistic UI update
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: newStage } : i));

        try {
            await mockApi.updateInventoryItem(itemId, { stage: newStage });
        } catch (err) {
            toast.error("Failed to update status");
            // Rollback
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: oldStage } : i));
        }
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Image</TableHead>
                        <TableHead>Card Name</TableHead>
                        <TableHead>Set</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Market</TableHead>
                        <TableHead className="text-right">Listing</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const profile = cards.find(c => c.id === item.cardProfileId);
                        const price = pricing.find(p => p.cardProfileId === item.cardProfileId);
                        const marketPrice = item.itemType === "SEALED" ? price?.sealedPrice : price?.rawPrice;

                        return (
                            <TableRow key={item.id} className="cursor-pointer group" onClick={() => onItemClick(item)}>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="w-12 h-16 rounded overflow-hidden border">
                                        <img
                                            src={profile?.imageUrl || "https://placehold.co/100x150?text=?"}
                                            alt={profile?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {profile?.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                    {profile?.set} {profile?.cardNumber && `#${profile.cardNumber}`}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px]">{item.itemType}</Badge>
                                </TableCell>
                                <TableCell>
                                    {item.gradeValue ? (
                                        <Badge className="bg-blue-600 text-[10px]">
                                            {item.gradeProvider} {item.gradeValue}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Raw</span>
                                    )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        defaultValue={item.stage}
                                        onValueChange={(val) => handleStageChange(item.id, val as InventoryStage)}
                                    >
                                        <SelectTrigger className="h-8 w-[140px] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLUMNS.map(col => (
                                                <SelectItem key={col.id} value={col.id} className="text-xs">
                                                    {col.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                    ${marketPrice?.toFixed(2) || "-"}
                                </TableCell>
                                <TableCell className="text-right font-bold text-xs">
                                    {item.listingPrice ? `$${item.listingPrice.toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                No items found matching your filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
