"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { listInventory, getMarketProducts, listStatuses } from "@/lib/api";
import { InventoryItem, MarketProduct, InventoryStage, WorkflowStatus } from "@/lib/types";
import { ItemCard } from "@/components/inventory/ItemCard";
import { ItemDrawer } from "@/components/inventory/ItemDrawer";
import { KanbanBoard } from "@/components/inventory/KanbanBoard";
import { InventoryList } from "@/components/inventory/InventoryList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { COLUMNS } from "@/components/inventory/dnd";

function InventoryContent() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<string>("all");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
    const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
    const lastProcessedItemIdRef = useRef<string | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const openItem = (item: InventoryItem) => {
        setSelectedItem(item);
        const params = new URLSearchParams(searchParams.toString());
        params.set("itemId", item.id);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const closeItem = () => {
        setSelectedItem(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("itemId");
        params.delete("tab");
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const fetchData = async () => {
        try {
            const [inv, market, stats] = await Promise.all([
                listInventory(),
                getMarketProducts({ page: 1, limit: 100 }),
                listStatuses()
            ]);
            setItems(inv);
            setMarketProducts(market.items);
            setStatuses(stats);
        } catch (err) {
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const savedView = localStorage.getItem("inventory_view_mode") as "kanban" | "list";
        if (savedView) setViewMode(savedView);
    }, []);

    useEffect(() => {
        if (!loading && items.length > 0) {
            const urlItemId = searchParams.get("itemId");
            
            // 1. URL has new item ID, update state
            if (urlItemId && urlItemId !== lastProcessedItemIdRef.current) {
                const item = items.find(i => i.id === urlItemId);
                if (item) setSelectedItem(item);
                lastProcessedItemIdRef.current = urlItemId;
            } 
            // 2. URL removed item ID (e.g., back button or closeItem finished), clear state
            else if (!urlItemId && lastProcessedItemIdRef.current !== null) {
                setSelectedItem(null);
                lastProcessedItemIdRef.current = null;
            }
            // 3. Keep selectedItem data fresh if items changed (e.g., after fetchData)
            else if (urlItemId && urlItemId === lastProcessedItemIdRef.current && selectedItem) {
                const updatedItem = items.find(i => i.id === urlItemId);
                if (updatedItem && updatedItem !== selectedItem) {
                    setSelectedItem(updatedItem);
                }
            }
        }
    }, [loading, items, searchParams, selectedItem]);

    const handleViewChange = (val: string) => {
        const mode = val as "kanban" | "list";
        setViewMode(mode);
        localStorage.setItem("inventory_view_mode", mode);
    };

    const filteredItems = useMemo(() => {
        const s = search.toLowerCase();
        return items
            .sort((a, b) => {
                const orderA = (a as any).sortOrder ?? 0;
                const orderB = (b as any).sortOrder ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .filter(item => {
                const matchesSearch = !search || (() => {
                    const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
                    if (itType === "SEALED_PRODUCT" || (itType as any) === "SEALED") {
                        return (item as any).productName?.toLowerCase().includes(s) ||
                            (item as any).productType?.toLowerCase().includes(s);
                    }

                    const profile = item.cardProfile;
                    return (
                        profile?.name.toLowerCase().includes(s) ||
                        profile?.set.toLowerCase().includes(s) ||
                        profile?.cardNumber?.toLowerCase().includes(s)
                    );
                })();

                const matchesStage = stageFilter === "all" || item.statusId === stageFilter;

                return matchesSearch && matchesStage;
            });
    }, [items, marketProducts, search, stageFilter]);

    if (loading) {
        return <InventorySkeleton />;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground">Manage your collection across all stages.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="relative flex-1 min-w-[200px] md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search cards..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="w-[150px] hidden md:flex">
                            <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {statuses.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Tabs value={viewMode} onValueChange={handleViewChange} className="hidden sm:block">
                        <TabsList className="grid w-[160px] grid-cols-2">
                            <TabsTrigger value="kanban" className="flex items-center gap-2">
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span className="text-xs">Kanban</span>
                            </TabsTrigger>
                            <TabsTrigger value="list" className="flex items-center gap-2">
                                <List className="h-3.5 w-3.5" />
                                <span className="text-xs">List</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button asChild className="shrink-0">
                        <Link href="/inventory/add">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Link>
                    </Button>
                </div>
            </div>

            {viewMode === "kanban" ? (
                <ScrollArea className="flex-1 -mx-4 md:-mx-8">
                    <KanbanBoard
                        items={filteredItems}
                        setItems={setItems}
                        cards={marketProducts as any}
                        onUpdate={fetchData}
                        onItemClick={openItem}
                        statuses={statuses}
                    />
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            ) : (
                <div className="flex-1">
                    <InventoryList
                        items={filteredItems}
                        setItems={setItems}
                        cards={marketProducts as any}
                        onUpdate={fetchData}
                        onItemClick={openItem}
                        statuses={statuses}
                    />
                </div>
            )}

            <ItemDrawer
                isOpen={!!selectedItem}
                item={selectedItem}
                profile={marketProducts.find(c => {
                    const vid = (selectedItem as any)?.cardVariantId || (selectedItem as any)?.cardProfileId || selectedItem?.refPriceChartingProductId;
                    return c.id === vid;
                }) as any}
                onClose={closeItem}
                onUpdate={fetchData}
                statuses={statuses}
            />
        </div>
    );
}

function InventorySkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-6 gap-4 h-[600px]">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-full w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<InventorySkeleton />}>
            <InventoryContent />
        </Suspense>
    );
}

