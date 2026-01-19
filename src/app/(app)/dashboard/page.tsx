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
import { mockApi } from "@/lib/mockApi";
import { InventoryItem, PricingSnapshot, CardProfile, SellerProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function DashboardPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [pricing, setPricing] = useState<PricingSnapshot[]>([]);
    const [cards, setCards] = useState<CardProfile[]>([]);
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [inv, prc, crd, prof] = await Promise.all([
                mockApi.listInventory(),
                mockApi.listPricing(),
                mockApi.listCardProfiles(),
                mockApi.getCurrentUser()
            ]);
            setItems(inv);
            setPricing(prc);
            setCards(crd);
            setProfile(prof);
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
        const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
        const forSaleItems = items.filter(i => i.stage === "LISTED").reduce((acc, i) => acc + i.quantity, 0);

        const marketValue = items.reduce((acc, item) => {
            const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
            const isSealed = itType === "SEALED_PRODUCT" || itType === "SEALED";

            const vid = (item as any).cardVariantId || (item as any).cardProfileId;
            const bid = vid?.includes("-") ? vid.split("-")[0] : vid;

            const price = pricing.find(p => p.cardProfileId === bid || p.cardProfileId === vid);
            const unitPrice = isSealed ? (price?.sealedPrice ?? 0) : (price?.rawPrice ?? 0);

            return acc + (unitPrice * item.quantity);
        }, 0);

        const stages = items.reduce((acc, item) => {
            acc[item.stage] = (acc[item.stage] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        return { totalItems, forSaleItems, marketValue, stages };
    }, [items, pricing]);

    const lastUpdated = useMemo(() => {
        if (pricing.length === 0) return null;
        return new Date(pricing[0].updatedAt).toLocaleString();
    }, [pricing]);

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
                        <div className="text-2xl font-bold">${stats.marketValue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Based on mock market data</p>
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

                                const vid = (item as any).cardVariantId || (item as any).cardProfileId;
                                const bid = vid?.includes("-") ? vid.split("-")[0] : vid;
                                const profile = cards.find(c => c.id === bid);

                                const displayName = isSealed ? (item as any).productName : profile?.name || "Unknown Asset";

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
