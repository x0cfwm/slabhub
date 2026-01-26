"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MarketProduct, MarketPriceHistory } from "@/lib/types";
import { getProductPriceHistory } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MarketPricingDrawerProps {
    product: MarketProduct | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MarketPricingDrawer({ product, open, onOpenChange }: MarketPricingDrawerProps) {
    const [history, setHistory] = useState<MarketPriceHistory | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (product && open) {
            setLoading(true);
            getProductPriceHistory(product.id)
                .then(setHistory)
                .catch((err) => {
                    console.error("Failed to fetch history", err);
                })
                .finally(() => setLoading(false));
        } else if (!open) {
            // Reset history when closed to avoid showing old data next time
            setHistory(null);
        }
    }, [product, open]);

    if (!product) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto w-full sm:p-10">
                <SheetHeader className="mb-8">
                    <SheetTitle className="text-2xl font-bold">{product.name}</SheetTitle>
                    <SheetDescription className="font-mono text-sm flex items-center gap-3">
                        {product.number}
                        <Badge variant="secondary" className="font-sans text-xs px-2">{product.source}</Badge>
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="flex justify-center bg-muted/30 p-4 rounded-xl border border-dashed">
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-48 h-auto rounded-lg shadow-xl border bg-card"
                            />
                        ) : (
                            <div className="w-48 aspect-[2.5/3.5] bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs text-center p-4">
                                No Image Available
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-xl border shadow-sm">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Raw Price</p>
                            <p className="text-2xl font-bold text-primary">${product.rawPrice.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-card rounded-xl border shadow-sm">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Sealed Price</p>
                            <p className="text-2xl font-bold">
                                {product.sealedPrice ? `$${product.sealedPrice.toFixed(2)}` : "-"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm px-4 py-2 bg-muted/20 rounded-lg text-muted-foreground italic">
                        <span>Last updated</span>
                        <span>{new Date(product.lastUpdated).toLocaleString()}</span>
                    </div>

                    <hr className="border-border" />

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center justify-between">
                            Recent Sales
                            <span className="text-[10px] font-normal text-muted-foreground">Last 10 entries</span>
                        </h3>
                        {loading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : !history || history.prices.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/10">
                                No recent sales data found.
                            </div>
                        ) : (
                            <div className="border rounded-xl overflow-hidden bg-card">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs h-10 px-4">Date</TableHead>
                                            <TableHead className="text-xs h-10 px-4">Title</TableHead>
                                            <TableHead className="text-xs h-10 px-4">Price</TableHead>
                                            <TableHead className="text-xs h-10 text-right pr-6">Source</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.prices.map((entry, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-xs py-3 px-4 font-medium">{entry.date}</TableCell>
                                                <TableCell className="text-xs py-3 px-4 max-w-[280px] truncate" title={entry.title}>
                                                    {entry.title}
                                                </TableCell>
                                                <TableCell className="text-xs py-3 px-4 font-semibold">
                                                    ${entry.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right py-3 pr-6">
                                                    <Badge variant="outline" className="text-[10px] px-2 h-5 font-normal">
                                                        {entry.source}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
