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
import { InventoryItem, MarketProduct, InventoryStage } from "@/lib/types";
import { COLUMNS } from "./dnd";
import { updateInventoryItem } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface InventoryListProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    cards: MarketProduct[];
    onUpdate: () => void;
    onItemClick: (item: InventoryItem) => void;
}

export function InventoryList({ items, setItems, cards, onUpdate, onItemClick }: InventoryListProps) {
    const handleStageChange = async (itemId: string, newStage: InventoryStage) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const oldStage = item.stage;

        // Optimistic UI update
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: newStage } : i));

        try {
            await updateInventoryItem(itemId, { stage: newStage });
        } catch (err) {
            toast.error("Failed to update status");
            // Rollback
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: oldStage } : i));
        }
    };

    return (
        <div className="rounded-xl border bg-card/50 backdrop-blur-md overflow-hidden">
            <Table>
                <TableHeader className="bg-accent/30">
                    <TableRow>
                        <TableHead className="w-[80px]">Asset</TableHead>
                        <TableHead>Descriptor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Grade / Cond</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Aquisition</TableHead>
                        <TableHead className="text-right">Market Est.</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
                        const variantId = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
                        const marketProduct = cards.find(p => p.id === variantId);

                        const isSealed = itType === "SEALED_PRODUCT" || (itType as any) === "SEALED";
                        const marketPrice = isSealed ? marketProduct?.sealedPrice : marketProduct?.rawPrice;

                        const displayName = isSealed ? (item as any).productName || marketProduct?.name : marketProduct?.name || "Unknown Asset";
                        const typeLabel = itType.replace("SINGLE_CARD_", "").replace("_PRODUCT", "");

                        return (
                            <TableRow key={item.id} className="cursor-pointer group hover:bg-primary/5 transition-colors" onClick={() => onItemClick(item)}>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="w-12 h-16 rounded-lg overflow-hidden border bg-accent/20 flex items-center justify-center">
                                        <img
                                            src={marketProduct?.imageUrl || "https://placehold.co/100x150?text=📦"}
                                            alt={displayName}
                                            className="w-full h-full object-contain p-1"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm tracking-tight">{displayName}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{isSealed ? (item as any).productType || "Sealed" : marketProduct?.set}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[9px] font-bold tracking-widest uppercase py-0 px-1.5 opacity-70">
                                        {typeLabel}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {itType === "SINGLE_CARD_GRADED" || (itType as any) === "GRADED" ? (
                                        <div className="flex flex-col gap-0.5">
                                            <Badge className="bg-blue-600 text-[9px] w-fit font-mono">
                                                {(item as any).gradingCompany || "???"} {(item as any).grade || ""}
                                            </Badge>
                                            <span className="text-[8px] font-mono text-muted-foreground">{(item as any).certNumber}</span>
                                        </div>
                                    ) : itType === "SINGLE_CARD_RAW" || (itType as any) === "RAW" ? (
                                        <Badge variant="outline" className="text-[9px] font-bold border-primary/30">
                                            {(item as any).condition || "Raw"}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">{(item as any).integrity || "Asset"}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-mono">x{item.quantity}</span>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        defaultValue={item.stage}
                                        onValueChange={(val) => handleStageChange(item.id, val as InventoryStage)}
                                    >
                                        <SelectTrigger className="h-7 w-[130px] text-[10px] font-bold bg-background/50 border-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLUMNS.map(col => (
                                                <SelectItem key={col.id} value={col.id} className="text-[10px]">
                                                    {col.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                    ${(item.acquisitionPrice || 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-xs text-primary">
                                    {marketPrice ? `$${marketPrice.toFixed(2)}` : (item.marketPriceSnapshot ? `$${Number(item.marketPriceSnapshot).toFixed(2)}` : "-")}
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
                                No assets found in registry.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
