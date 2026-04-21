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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
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
                        {(() => {
                            if ((loading || refreshing) && !history?.summary) {
                                return (
                                    <div className="space-y-3">
                                        <Skeleton className="h-10 w-full rounded-md" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                    </div>
                                );
                            }

                            const DISPLAY_LABELS: Record<string, string> = {
                                "Raw": "Raw",
                                "Grade 7": "PSA 7",
                                "Grade 8": "PSA 8",
                                "Grade 9": "PSA 9",
                                "Grade 9.5": "BGS 9.5",
                                "PSA 10": "PSA 10",
                            };

                            const GRADE_GROUPS = [
                                { id: "Raw", label: "Raw", members: ["Raw"] },
                                { id: "Pristine", label: "Perfect 10", members: ["CGC 10 Prist.", "CGC 10 Pristine", "BGS 10 Black"] },
                                { id: "Ten", label: "Grade 10", members: ["PSA 10", "BGS 10", "CGC 10", "SGC 10", "TAG 10", "ACE 10"] },
                                { id: "High", label: "Grades 9–9.5", members: ["Grade 9", "Grade 9.5"] },
                                { id: "Mid", label: "Grades 7–8", members: ["Grade 7", "Grade 8"] },
                                { id: "Low", label: "Grades 1–6", members: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"] },
                            ];

                            const summaryPrice = (id: string): number | undefined => {
                                switch (id) {
                                    case "Raw": return (history?.updatedRawPrice ?? product.rawPrice) ?? undefined;
                                    case "Grade 7": return history?.summary?.grade7;
                                    case "Grade 8": return history?.summary?.grade8;
                                    case "Grade 9": return history?.summary?.grade9;
                                    case "Grade 9.5": return history?.summary?.grade95;
                                    case "PSA 10": return history?.summary?.psa10;
                                    default: return undefined;
                                }
                            };

                            const salesFor = (id: string) =>
                                (history?.prices ?? []).filter(p => (p.grade === id) || (!p.grade && id === "Raw"));

                            const medianSalePrice = (id: string): number | undefined => {
                                const prices = salesFor(id).map(p => p.price).sort((a, b) => a - b);
                                if (prices.length === 0) return undefined;
                                const mid = Math.floor(prices.length / 2);
                                return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
                            };

                            const formatPrice = (n: number) =>
                                `$${n < 1 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;

                            const gradeIds = new Set<string>(["Raw", "Grade 7", "Grade 8", "Grade 9", "Grade 9.5", "PSA 10"]);
                            (history?.prices ?? []).forEach(p => { if (p.grade) gradeIds.add(p.grade); });

                            const gradeConfigs = Array.from(gradeIds)
                                .map(id => ({
                                    id,
                                    displayLabel: DISPLAY_LABELS[id] ?? id,
                                    price: summaryPrice(id) ?? medianSalePrice(id),
                                    sales: salesFor(id).length,
                                }))
                                .filter(g => g.price !== undefined);

                            const groupsWithData = GRADE_GROUPS
                                .map(group => ({
                                    ...group,
                                    grades: group.members
                                        .map(id => gradeConfigs.find(g => g.id === id))
                                        .filter((g): g is typeof gradeConfigs[number] => !!g)
                                        .sort((a, b) => b.sales - a.sales),
                                }))
                                .filter(g => g.grades.length > 0);

                            if (groupsWithData.length === 0) {
                                return <p className="text-sm text-muted-foreground italic px-1">No price estimates yet.</p>;
                            }

                            const allGrades = groupsWithData.flatMap(g => g.grades);
                            const selected = allGrades.find(g => g.id === selectedGrade) ?? allGrades[0];

                            const selectedSales = salesFor(selected.id)
                                .slice()
                                .sort((a, b) => a.date.localeCompare(b.date));
                            const salesPrices = selectedSales.map(s => s.price);
                            const minP = salesPrices.length ? Math.min(...salesPrices) : selected.price!;
                            const maxP = salesPrices.length ? Math.max(...salesPrices) : selected.price!;
                            const showRange = salesPrices.length > 1 && minP !== maxP;

                            return (
                                <div className="space-y-3">
                                    <Select value={selected.id} onValueChange={setSelectedGrade}>
                                        <SelectTrigger className="w-full h-10 bg-card">
                                            <SelectValue>
                                                <span className="flex items-center justify-between w-full gap-3 pr-2">
                                                    <span className="font-semibold text-sm">{selected.displayLabel}</span>
                                                    <span className="text-xs text-muted-foreground tabular-nums">
                                                        {formatPrice(selected.price!)}
                                                        {selected.sales > 0 && <span className="ml-1.5">· {selected.sales} sales</span>}
                                                    </span>
                                                </span>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groupsWithData.map(group => (
                                                <SelectGroup key={group.id}>
                                                    <SelectLabel className="text-[10px] uppercase tracking-wider">{group.label}</SelectLabel>
                                                    {group.grades.map(g => (
                                                        <SelectItem key={g.id} value={g.id}>
                                                            <span className="flex items-center justify-between w-full gap-6 min-w-[220px]">
                                                                <span className="font-medium">{g.displayLabel}</span>
                                                                <span className="flex items-center text-muted-foreground text-xs tabular-nums gap-1.5">
                                                                    <span>{formatPrice(g.price!)}</span>
                                                                    <span className="opacity-70 min-w-[32px] text-left">
                                                                        {g.sales > 0 ? `· ${g.sales}` : ""}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-transparent p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                                                    {selected.displayLabel}
                                                </p>
                                                <p className="text-3xl sm:text-4xl font-bold mt-1 tabular-nums leading-none">
                                                    {formatPrice(selected.price!)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                    {selected.sales > 0 ? `median of ${selected.sales} recent sale${selected.sales === 1 ? "" : "s"}` : "no recent sales — using catalog estimate"}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end justify-between gap-2 min-w-[120px] self-stretch">
                                                {showRange && (
                                                    <div className="text-right">
                                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Range</p>
                                                        <p className="text-xs font-semibold tabular-nums mt-0.5">
                                                            {formatPrice(minP)} – {formatPrice(maxP)}
                                                        </p>
                                                    </div>
                                                )}
                                                {salesPrices.length >= 2 && (
                                                    <Sparkline data={salesPrices} className="w-28 h-10" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
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

function Sparkline({ data, className }: { data: number[]; className?: string }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = 100 / (data.length - 1);
    const points = data.map((v, i) => `${(i * stepX).toFixed(2)},${(30 - ((v - min) / range) * 28).toFixed(2)}`).join(" ");
    const up = data[data.length - 1] >= data[0];
    const stroke = up ? "rgb(16 185 129)" : "rgb(239 68 68)";
    return (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className}>
            <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

