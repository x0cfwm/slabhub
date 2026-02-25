"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    Plus,
    Package,
    TrendingUp,
    ShoppingCart,
    History,
    ArrowUpRight,
    RefreshCw,
    Monitor,
    MonitorOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listInventory, getMe, getMarketProducts, getMarketValueHistory } from "@/lib/api";
import { InventoryItem, MarketProduct, SellerProfile, PortfolioHistoryEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MarketValueChart } from "@/components/dashboard/MarketValueChart";

export default function DashboardPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [history, setHistory] = useState<PortfolioHistoryEntry[]>([]);
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [inv, market, prof, hist] = await Promise.all([
                listInventory(),
                getMarketProducts({ page: 1, limit: 100 }), // Fetch some market products for pricing
                getMe(),
                getMarketValueHistory(90)
            ]);
            setItems(inv);
            setMarketProducts(market.items);
            setProfile(prof?.profile || null);
            setHistory(hist);
        } catch (err) {
            toast.error("Failed to fetch dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const totalItems = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
        const forSaleItems = items.filter(i => i.stage === "LISTED").reduce((acc, i) => acc + (i.quantity || 1), 0);

        const marketValue = items.reduce((acc, item) => {
            const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
            const isSealed = itType === "SEALED_PRODUCT" || itType === "SEALED";

            let unitPrice = item.marketPrice ?? 0;

            if (!unitPrice) {
                const vid = (item as any).cardVariantId || (item as any).cardProfileId;
                const refId = item.refPriceChartingProductId;

                // Try to find price from market products (fallback)
                const marketProduct = marketProducts.find(p => p.id === refId || p.id === vid);

                if (marketProduct) {
                    if (isSealed) {
                        unitPrice = marketProduct.sealedPrice ?? 0;
                    } else if (itType === "SINGLE_CARD_GRADED") {
                        // Attempt to match grade
                        const gradeStr = String((item as any).gradeValue || (item as any).grade || "").toLowerCase();
                        const numericGrade = gradeStr.match(/\d+(\.\d+)?/)?.[0];

                        if (numericGrade === '10') unitPrice = marketProduct.grade10Price ?? marketProduct.rawPrice ?? 0;
                        else if (numericGrade === '9.5') unitPrice = marketProduct.grade95Price ?? marketProduct.rawPrice ?? 0;
                        else if (numericGrade === '9') unitPrice = marketProduct.grade9Price ?? marketProduct.rawPrice ?? 0;
                        else if (numericGrade === '8') unitPrice = marketProduct.grade8Price ?? marketProduct.rawPrice ?? 0;
                        else if (numericGrade === '7') unitPrice = marketProduct.grade7Price ?? marketProduct.rawPrice ?? 0;
                        else unitPrice = marketProduct.rawPrice ?? 0;
                    } else {
                        unitPrice = marketProduct.rawPrice ?? 0;
                    }
                } else if (item.marketPriceSnapshot) {
                    unitPrice = Number(item.marketPriceSnapshot);
                }
            }

            return acc + (unitPrice * (item.quantity || 1));
        }, 0);

        const stages = items.reduce((acc, item) => {
            acc[item.stage] = (acc[item.stage] || 0) + (item.quantity || 1);
            return acc;
        }, {} as Record<string, number>);

        return { totalItems, forSaleItems, marketValue, stages };
    }, [items, marketProducts]);

    const lastUpdated = useMemo(() => {
        if (marketProducts.length === 0) return null;
        return new Date(marketProducts[0].lastUpdated).toLocaleString();
    }, [marketProducts]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    {profile && (
                        <Badge
                            variant={profile.isActive ? "default" : "secondary"}
                            className={profile.isActive ? "bg-green-500 hover:bg-green-600" : "bg-muted text-muted-foreground"}
                        >
                            {profile.isActive ? (
                                <><Monitor className="w-3 h-3 mr-1" /> Store Live</>
                            ) : (
                                <><MonitorOff className="w-3 h-3 mr-1" /> Store Hidden</>
                            )}
                        </Badge>
                    )}
                </div>
                <Button asChild>
                    <Link href="/inventory/add">
                        <Plus className="mr-2 h-4 w-4" />
                        Quick Add
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                        <p className="text-xs text-muted-foreground">Across all stages</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">For Sale</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.forSaleItems}</div>
                        <p className="text-xs text-muted-foreground">Visible on public page</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Market Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${Math.round(stats.marketValue).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Based on market data</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Price Refreshed</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium truncate">{lastUpdated || "N/A"}</div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                            <Link href="/pricing">Refresh Pricing</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <MarketValueChart items={items} history={history} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Inventory Breakdown</CardTitle>
                        <CardDescription>Items distributed by current status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(stats.stages).map(([stage, count]) => (
                                <div key={stage} className="flex items-center">
                                    <div className="w-full">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium capitalize">
                                                {stage.replace(/_/g, " ").toLowerCase()}
                                            </span>
                                            <span className="text-sm text-muted-foreground">{count}</span>
                                        </div>
                                        <div className="w-full bg-accent rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full"
                                                style={{ width: `${(count / stats.totalItems) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Mock recent updates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {items.slice(0, 5).map((item) => {
                                const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
                                const isSealed = itType === "SEALED_PRODUCT" || itType === "SEALED";

                                const displayName = isSealed ? (item as any).productName : item.cardProfile?.name || "Unknown Asset";

                                return (
                                    <div key={item.id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{displayName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Status: <span className="font-semibold text-primary">{item.stage.replace(/_/g, " ").toLowerCase()}</span>
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium">
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
