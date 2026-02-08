"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MarketProduct, MarketPriceHistory } from "@/lib/types";
import { getProductPriceHistory } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketPricingDrawerProps {
    product: MarketProduct | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MarketPricingDrawer({ product, open, onOpenChange }: MarketPricingDrawerProps) {
    const [history, setHistory] = useState<MarketPriceHistory | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = (isRefresh = false) => {
        if (!product) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        getProductPriceHistory(product.id, isRefresh)
            .then(setHistory)
            .catch((err) => {
                console.error("Failed to fetch history", err);
                setError(err.message || "Failed to fetch live pricing data");
            })
            .finally(() => {
                setLoading(false);
                setRefreshing(false);
            });
    };

    useEffect(() => {
        if (product && open) {
            fetchHistory();
        } else if (!open) {
            setHistory(null);
        }
    }, [product, open]);

    if (!product) return null;

    const handleRefresh = () => {
        fetchHistory(true);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto w-full p-6 sm:p-10">
                <SheetHeader className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <SheetTitle className="text-2xl font-bold">{product.name}</SheetTitle>
                            <SheetDescription className="font-mono text-sm flex items-center gap-3">
                                {product.number}
                                <span className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-sans text-xs px-2">{product.source}</Badge>
                                    {product.priceChartingUrl && (
                                        <a
                                            href={product.priceChartingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-0.5"
                                        >
                                            View on PriceCharting
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </span>
                            </SheetDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={handleRefresh}
                            disabled={refreshing || loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-xl border shadow-sm relative overflow-hidden transition-all hover:border-primary/50">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Raw Price</p>
                            {(loading || refreshing) ? (
                                <Skeleton className="h-8 w-24 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-primary">
                                    ${(history?.updatedRawPrice ?? product.rawPrice).toFixed(2)}
                                </p>
                            )}
                        </div>
                        <div className="p-4 bg-card rounded-xl border shadow-sm relative overflow-hidden transition-all hover:border-primary/50">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Sealed Price</p>
                            {(loading || refreshing) ? (
                                <Skeleton className="h-8 w-24 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold">
                                    {product.sealedPrice ? `$${product.sealedPrice.toFixed(2)}` : "-"}
                                </p>
                            )}
                        </div>
                    </div>

                    {(loading || refreshing) ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-32 px-1" />
                            <div className="grid grid-cols-3 gap-3">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                            </div>
                        </div>
                    ) : history?.summary && (history.summary.grade9 || history.summary.grade95 || history.summary.psa10) ? (
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Graded Estimates (PriceCharting)</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {history.summary.grade9 && (
                                    <div className="p-3 bg-muted/20 rounded-xl border border-border/50 flex flex-col justify-center transition-colors hover:bg-muted/30">
                                        <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider mb-1">PSA 9</p>
                                        <p className="text-base font-bold">${history.summary.grade9.toFixed(2)}</p>
                                    </div>
                                )}
                                {history.summary.grade95 && (
                                    <div className="p-3 bg-muted/20 rounded-xl border border-border/50 flex flex-col justify-center transition-colors hover:bg-muted/30">
                                        <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider mb-1">BGS 9.5</p>
                                        <p className="text-base font-bold">${history.summary.grade95.toFixed(2)}</p>
                                    </div>
                                )}
                                {history.summary.psa10 && (
                                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex flex-col justify-center transition-colors hover:bg-primary/10">
                                        <p className="text-[8px] text-primary uppercase font-bold tracking-wider mb-1">PSA 10</p>
                                        <p className="text-base font-bold text-primary">${history.summary.psa10.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between text-sm px-4 py-2 bg-muted/20 rounded-lg text-muted-foreground italic">
                        <span>Last updated</span>
                        {(loading || refreshing) ? (
                            <Skeleton className="h-4 w-32" />
                        ) : (
                            <span>{new Date(product.lastUpdated).toLocaleString()}</span>
                        )}
                    </div>

                    <hr className="border-border" />

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                Recent Sales
                                {history?.mode === "parsed" && (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-5 py-0">
                                        Live: PriceCharting
                                    </Badge>
                                )}
                            </span>
                            <span className="text-[10px] font-normal text-muted-foreground">Last 10 entries</span>
                        </h3>

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold uppercase tracking-wider">Error:</span>
                                    <span>{error}</span>
                                </div>
                                <p className="text-[10px] opacity-70">
                                    This might be due to a missing PriceCharting link or a temporary scraping issue.
                                </p>
                            </div>
                        )}

                        {(loading || refreshing) ? (
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
                                                <TableCell className="text-xs py-3 px-4 font-medium whitespace-nowrap">{entry.date}</TableCell>
                                                <TableCell className="text-xs py-3 px-4 max-w-[280px] truncate" title={entry.title}>
                                                    {entry.link ? (
                                                        <a
                                                            href={entry.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:text-primary hover:underline flex items-center gap-1 inline-flex items-center"
                                                        >
                                                            {entry.title}
                                                            <ExternalLink className="h-3 w-3 inline-block" />
                                                        </a>
                                                    ) : (
                                                        entry.title
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs py-3 px-4 font-semibold">
                                                    ${entry.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right py-3 pr-6">
                                                    {entry.link ? (
                                                        <a
                                                            href={entry.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block"
                                                        >
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-2 h-5 font-normal cursor-pointer hover:bg-muted transition-colors ${entry.source === 'eBay' ? 'border-blue-500/30 text-blue-500 hover:border-blue-500' :
                                                                    entry.source === 'TCGPlayer' ? 'border-orange-500/30 text-orange-500 hover:border-orange-500' :
                                                                        ''
                                                                    }`}
                                                            >
                                                                {entry.source}
                                                            </Badge>
                                                        </a>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] px-2 h-5 font-normal ${entry.source === 'eBay' ? 'border-blue-500/30 text-blue-500' :
                                                                entry.source === 'TCGPlayer' ? 'border-orange-500/30 text-orange-500' :
                                                                    ''
                                                                }`}
                                                        >
                                                            {entry.source}
                                                        </Badge>
                                                    )}
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
