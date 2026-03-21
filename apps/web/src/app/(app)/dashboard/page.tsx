"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Plus,
    ArrowUpRight,
    Monitor,
    MonitorOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listInventory, getMe, getMarketValueHistory } from "@/lib/api";
import { InventoryItem, SellerProfile, PortfolioHistoryEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MarketValueChart } from "@/components/dashboard/MarketValueChart";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function DashboardPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get("tab") || "overview";

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.push(`/dashboard?${params.toString()}`);
    };

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [history, setHistory] = useState<PortfolioHistoryEntry[]>([]);
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [inv, prof, hist] = await Promise.all([
                listInventory(),
                getMe(),
                getMarketValueHistory(90)
            ]);
            setItems(inv);
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
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        // Only include items that are not archived and were acquired as of now to match chart logic
        const allItems = items.filter(item => {
            if (item.stage === "ARCHIVED") return false;

            const acqDate = item.acquisitionDate ? new Date(item.acquisitionDate) : new Date(item.createdAt);
            return acqDate <= now;
        });

        // Split into active (in portfolio) and sold
        const activeItems = allItems.filter(i => i.stage !== "SOLD");
        const soldItems = allItems.filter(i => i.stage === "SOLD");

        const totalItems = activeItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
        const stages = allItems.reduce((acc, item) => {
            acc[item.stage] = (acc[item.stage] || 0) + (item.quantity || 1);
            return acc;
        }, {} as Record<string, number>);

        return { totalItems, stages };
    }, [items]);



    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Inventory Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Shop Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 border-none p-0 outline-none">


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
                </TabsContent>

                <TabsContent value="analytics" className="border-none p-0 outline-none">
                    <AnalyticsDashboard />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6">
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        }>
            <DashboardPageContent />
        </Suspense>
    );
}
