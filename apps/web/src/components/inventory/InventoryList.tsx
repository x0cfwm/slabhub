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
import { InventoryItem, MarketProduct, InventoryStage, InventoryStatus } from "@/lib/types";
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
    statuses: InventoryStatus[];
}

export function InventoryList({ items, setItems, cards, onUpdate, onItemClick, statuses }: InventoryListProps) {
    const handleStatusChange = async (itemId: string, newStatusId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const oldStatusId = item.statusId;
        const selectedStatus = statuses.find(s => s.id === newStatusId);

        // Optimistic UI update
        setItems(prev => prev.map(i => i.id === itemId ? {
            ...i,
            statusId: newStatusId,
            sortOrder: 0,
            stage: selectedStatus?.name.toUpperCase().replace(/\s+/g, '_') as any
        } : i));

        try {
            await updateInventoryItem(itemId, { statusId: newStatusId, sortOrder: 0 });
        } catch (err) {
            toast.error("Failed to update status");
            // Rollback
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, statusId: oldStatusId } : i));
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
                        const marketProduct = cards.find(p => p.id === variantId) || item.cardProfile;

                        const isSealed = itType === "SEALED_PRODUCT" || (itType as any) === "SEALED";
                        const marketPrice = item.marketPrice ?? (isSealed ? (marketProduct as any)?.sealedPrice : (marketProduct as any)?.rawPrice);

                        const displayName = isSealed ? (item as any).productName || marketProduct?.name : marketProduct?.name || "Unknown Asset";
                        const typeLabel = itType.replace("SINGLE_CARD_", "").replace("_PRODUCT", "");

                        return (
                            <TableRow key={item.id} className="cursor-pointer group hover:bg-primary/5 transition-colors" onClick={() => onItemClick(item)}>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="w-12 h-16 rounded-lg overflow-hidden border bg-accent/20 flex items-center justify-center">
                                        <img
                                            src={item.photos?.[0] || (item as any).frontMediaUrl || (marketProduct as any)?.imageUrl || `https://placehold.co/100x150?text=${isSealed ? '📦' : '🎴'}`}
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
                                        value={item.statusId || ""}
                                        onValueChange={(val) => handleStatusChange(item.id, val)}
                                    >
                                        <SelectTrigger className="h-7 w-[130px] text-[10px] font-bold bg-background/50 border-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ backgroundColor: s.color || '#94a3b8' }}
                                                        />
                                                        {s.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                    ${Math.round(item.acquisitionPrice || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-xs text-primary">
                                    {typeof marketPrice === 'number' ? `$${Math.round(marketPrice).toLocaleString()}` : (item.marketPriceSnapshot ? `$${Math.round(Number(item.marketPriceSnapshot)).toLocaleString()}` : "-")}
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
