"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMarketProducts, getMarketSets, getMarketProduct } from "@/lib/api";
import { MarketProduct, MarketSet } from "@/lib/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MarketPricingDrawer } from "@/components/pricing/MarketPricingDrawer";

const LIMIT = 25;

function PricingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const setExternalId = searchParams.get("setExternalId") || "all";
    const productType = searchParams.get("productType") || "all";

    const [data, setData] = useState<{ items: MarketProduct[], total: number } | null>(null);
    const [sets, setSets] = useState<MarketSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [localSearch, setLocalSearch] = useState(search);
    const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const fetchData = useCallback(async (p: number, s: string, setExId: string, pt: string) => {
        setLoading(true);
        try {
            const res = await getMarketProducts({
                page: p,
                limit: LIMIT,
                search: s,
                setExternalId: setExId === "all" ? undefined : setExId,
                productType: pt === "all" ? undefined : pt
            });
            setData(res);
        } catch (err) {
            toast.error("Failed to fetch market data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        getMarketSets().then(setSets).catch(err => console.error("Failed to fetch sets", err));
    }, []);

    useEffect(() => {
        fetchData(page, search, setExternalId, productType);
    }, [page, search, setExternalId, productType, fetchData]);

    // Sync selectedProduct with URL productId
    useEffect(() => {
        const productId = searchParams.get("productId");
        if (productId) {
            if (selectedProduct?.id !== productId) {
                // Try finding in current data
                const found = data?.items.find(p => p.id === productId);
                if (found) {
                    setSelectedProduct(found);
                    setDrawerOpen(true);
                } else {
                    // Fetch if not in current data or not loaded yet
                    setLoading(true);
                    getMarketProduct(productId)
                        .then(p => {
                            setSelectedProduct(p);
                            setDrawerOpen(true);
                        })
                        .catch(err => {
                            console.error("Failed to fetch product for URL", err);
                            // If failed, maybe remove the invalid ID from URL
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete("productId");
                            router.replace(`?${params.toString()}`);
                        })
                        .finally(() => setLoading(false));
                }
            } else {
                // If IDs match but drawer is closed (e.g. back button), open it
                if (!drawerOpen) setDrawerOpen(true);
            }
        } else {
            // URL has no productId, close drawer if it was open from a direct link/refresh
            if (drawerOpen) {
                setDrawerOpen(false);
                setSelectedProduct(null);
            }
        }
    }, [searchParams, data]); // data is needed to check if product is already in list

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== search) {
                const params = new URLSearchParams(searchParams.toString());
                if (localSearch) params.set("search", localSearch);
                else params.delete("search");
                params.set("page", "1"); // Reset to page 1 on new search
                router.push(`?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch, search, router, searchParams]);


    const handleSetChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") params.delete("setExternalId");
        else params.set("setExternalId", value);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleTypeChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") params.delete("productType");
        else params.set("productType", value);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    };

    const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

    const openDetails = (product: MarketProduct) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("productId", product.id);
        router.push(`?${params.toString()}`);
        setSelectedProduct(product);
        setDrawerOpen(true);
    };

    const handleDrawerChange = (open: boolean) => {
        setDrawerOpen(open);
        if (!open) {
            const params = new URLSearchParams(searchParams.toString());
            if (params.has("productId")) {
                params.delete("productId");
                router.push(`?${params.toString()}`);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Market Pricing</h1>
                    <p className="text-muted-foreground">Global reference prices powered by RefPriceChartingProduct data.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-full md:flex-1 md:max-w-sm leading-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search card profiles..."
                        className="pl-8"
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                    />
                </div>
                {mounted ? (
                    <>
                        <div className="w-full sm:w-auto sm:min-w-[200px]">
                            <Select value={setExternalId} onValueChange={handleSetChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Sets" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sets</SelectItem>
                                    {sets.map((s) => (
                                        <SelectItem key={s.externalId} value={s.externalId}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full sm:w-auto sm:min-w-[160px]">
                            <Select value={productType} onValueChange={handleTypeChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="SINGLE_CARD">Single Card</SelectItem>
                                    <SelectItem value="SEALED_PACK">Sealed Pack</SelectItem>
                                    <SelectItem value="SEALED_BOX">Sealed Box</SelectItem>
                                    <SelectItem value="SEALED_OTHER">Sealed Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4">
                        <div className="h-9 w-[200px] bg-muted/20 animate-pulse rounded-md border" />
                        <div className="h-9 w-[160px] bg-muted/20 animate-pulse rounded-md border" />
                    </div>
                )}
            </div>

            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50 text-[10px] uppercase tracking-wider font-bold">
                        <TableRow>
                            <TableHead className="w-[80px]">Card</TableHead>
                            <TableHead>Card Name</TableHead>
                            <TableHead className="w-[300px]">Market Prices</TableHead>
                            <TableHead>Last Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && !data ? (
                            [...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-12 w-8 rounded" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No products found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((product) => (
                                <TableRow
                                    key={product.id}
                                    className="cursor-pointer hover:bg-muted/30 transition-colors group"
                                    onClick={() => openDetails(product)}
                                >
                                    <TableCell>
                                        <div className="h-12 w-10 relative bg-muted rounded overflow-hidden flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} className="h-full w-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground">N/A</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm group-hover:text-primary transition-colors">{product.name}</span>
                                                {product.productType && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold text-muted-foreground border-muted-foreground/20">
                                                        {product.productType.replace('SEALED_', '')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono">{product.number}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5 py-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-sm">
                                                    {product.rawPrice && product.rawPrice > 0 ? `$${product.rawPrice.toFixed(2)}` : "-"}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">Raw</span>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                {[
                                                    { label: "10", price: product.grade10Price },
                                                    { label: "9.5", price: product.grade95Price },
                                                    { label: "9", price: product.grade9Price },
                                                    { label: "8", price: product.grade8Price },
                                                    { label: "7", price: product.grade7Price },
                                                ].filter(g => g.price && g.price > 0).map((g) => (
                                                    <div key={g.label} className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-muted border border-border/50">
                                                        <span className="text-[8px] font-bold text-muted-foreground">{g.label}</span>
                                                        <span className="text-[10px] font-semibold">${g.price?.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] text-muted-foreground">
                                        {new Date(product.lastUpdated).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                    <p className="text-xs text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * LIMIT + 1}</span> to{" "}
                        <span className="font-medium">{Math.min(page * LIMIT, data?.total || 0)}</span> of{" "}
                        <span className="font-medium">{data?.total}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {/* Simple paginator */}
                            <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md min-w-[80px] text-center">
                                Page {page} of {totalPages}
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= totalPages}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <MarketPricingDrawer
                product={selectedProduct}
                open={drawerOpen}
                onOpenChange={handleDrawerChange}
            />
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[500px] w-full" /></div>}>
            <PricingContent />
        </Suspense>
    );
}
