"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MarketProduct, MarketPriceHistory } from "@/lib/types";
import { getProductPriceHistory } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/image-utils";
import { ImageZoomDialog, ImageZoomTrigger } from "@/components/common/ImageZoomDialog";


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
    const [selectedGrade, setSelectedGrade] = useState<string>("Raw");
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);



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
            setSelectedGrade("Raw");
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
                    <div className="flex flex-col sm:flex-row gap-6">
                        {product.imageUrl && (
                            <ImageZoomTrigger
                                imageUrl={product.imageUrl}
                                onZoom={(url) => setZoomedImage(url)}
                                className="mx-auto sm:mx-0"
                            >
                                <div className="w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden border bg-muted/30 shadow-md ring-1 ring-primary/5 relative group">
                                    <img
                                        src={getOptimizedImageUrl(product.imageUrl, { height: 300 })}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                </div>
                            </ImageZoomTrigger>
                        )}
                        <div className="flex-1 flex justify-between items-start min-w-0">

                            <div>
                                <SheetTitle className="text-2xl font-bold leading-tight">{product.name}</SheetTitle>
                                <SheetDescription className="font-mono text-sm flex items-center gap-3 mt-1">
                                    {product.number}
                                    <span className="flex items-center gap-2">
                                        {Boolean(product.source && !product.source.toLowerCase().includes('pricecharting')) && (
                                            <Badge variant="secondary" className="font-sans text-xs px-2">{product.source}</Badge>
                                        )}

                                    </span>
                                </SheetDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                onClick={handleRefresh}
                                disabled={refreshing || loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Market Estimates</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {(() => {
                                if ((loading || refreshing) && !history?.summary) {
                                    return (
                                        <>
                                            <Skeleton className="h-[38px] flex-1 min-w-0 rounded-lg" />
                                            <Skeleton className="h-[38px] flex-1 min-w-0 rounded-lg" />
                                            <Skeleton className="h-[38px] flex-1 min-w-0 rounded-lg" />
                                            <Skeleton className="h-[38px] flex-1 min-w-0 rounded-lg" />
                                        </>
                                    );
                                }

                                const gradeConfigs = [
                                    { id: "Raw", displayLabel: "Raw Price", price: history?.updatedRawPrice ?? product.rawPrice },
                                    { id: "Grade 9", displayLabel: "PSA 9", price: history?.summary?.grade9 },
                                    { id: "Grade 9.5", displayLabel: "BGS 9.5", price: history?.summary?.grade95 },
                                    { id: "PSA 10", displayLabel: "PSA 10", price: history?.summary?.psa10 },
                                    { id: "Grade 8", displayLabel: "PSA 8", price: history?.summary?.grade8 },
                                    { id: "Grade 7", displayLabel: "PSA 7", price: history?.summary?.grade7 },
                                ].filter(g => g.price !== undefined);

                                const sortedGrades = [...gradeConfigs].sort((a, b) => {
                                    const aHasSales = history?.prices.some(p => (p.grade === a.id) || (!p.grade && a.id === "Raw"));
                                    const bHasSales = history?.prices.some(p => (p.grade === b.id) || (!p.grade && b.id === "Raw"));
                                    if (aHasSales && !bHasSales) return -1;
                                    if (!aHasSales && bHasSales) return 1;
                                    return 0;
                                });

                                return sortedGrades.map((g) => {
                                    const hasSales = (loading || refreshing) ? true : history?.prices.some(p => (p.grade === g.id) || (!p.grade && g.id === "Raw"));
                                    const isSelected = selectedGrade === g.id;

                                    return (
                                        <div
                                            key={g.id}
                                            className={`w-20 sm:w-24 h-11 py-1 px-2 rounded-lg border flex flex-col justify-center transition-all cursor-pointer ${isSelected
                                                ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20"
                                                : "bg-muted/20 border-border/50 hover:bg-muted/30"
                                                } ${!hasSales ? "opacity-40 grayscale-[0.5] cursor-default pointer-events-none" : ""}`}
                                            onClick={() => hasSales && setSelectedGrade(g.id)}
                                        >
                                            <p className={`text-[7px] uppercase font-bold tracking-wider mb-0 ${isSelected ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>
                                                {g.displayLabel}
                                            </p>
                                            <p className={`text-xs font-bold ${isSelected ? "text-amber-700 dark:text-amber-400" : ""}`}>
                                                ${g.price! < 1 ? g.price!.toFixed(2) : Math.round(g.price!).toLocaleString()}
                                            </p>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>


                    <hr className="border-border" />


                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                Recent Sales

                            </span>

                        </h3>

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold uppercase tracking-wider">Error:</span>
                                    <span>{error}</span>
                                </div>
                                <p className="text-[10px] opacity-70">
                                    This might be due to a missing source link or a temporary scraping issue.
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
                                        {(() => {
                                            const filteredPrices = (history?.prices ?? []).filter(
                                                (entry) => !entry.grade || entry.grade === selectedGrade
                                            );

                                            if (filteredPrices.length === 0) {
                                                return (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs italic">
                                                            No recent sales found for {selectedGrade}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }

                                            return filteredPrices.map((entry, idx) => (
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
                                                        ${entry.price % 1 === 0 ? entry.price.toFixed(0) : entry.price.toFixed(2)}
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
                                            ));
                                        })()}
                                    </TableBody>

                                </Table>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] px-4 py-2 bg-muted/10 rounded-lg text-muted-foreground/60 italic mt-8">
                        <span>Last sync</span>
                        {(loading || refreshing) ? (
                            <Skeleton className="h-3 w-24" />
                        ) : (
                            <span>{new Date(product.lastUpdated).toLocaleString()}</span>
                        )}
                    </div>

                </div>
            </SheetContent>
            <ImageZoomDialog 
                imageUrl={zoomedImage} 
                open={!!zoomedImage} 
                onOpenChange={(open) => !open && setZoomedImage(null)} 
            />
        </Sheet>
    );
}

