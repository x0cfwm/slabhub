"use client";

import { useEffect, useState, useMemo } from "react";
import { mockApi } from "@/lib/mockApi";
import { InventoryItem, CardProfile, PricingSnapshot, InventoryStage } from "@/lib/types";
import { ItemCard } from "@/components/inventory/ItemCard";
import { ItemDrawer } from "@/components/inventory/ItemDrawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const COLUMNS: { id: InventoryStage; label: string }[] = [
    { id: "ACQUIRED", label: "Acquired" },
    { id: "IN_TRANSIT", label: "In Transit" },
    { id: "IN_STOCK_UNGRADED", label: "In Stock" },
    { id: "BEING_GRADED", label: "Grading" },
    { id: "UNGRADED_FOR_SALE", label: "For Sale" },
    { id: "GRADED_FOR_SALE", label: "Graded Sale" },
];

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [cards, setCards] = useState<CardProfile[]>([]);
    const [pricing, setPricing] = useState<PricingSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const fetchData = async () => {
        try {
            const [inv, crd, prc] = await Promise.all([
                mockApi.listInventory(),
                mockApi.listCardProfiles(),
                mockApi.listPricing()
            ]);
            setItems(inv);
            setCards(crd);
            setPricing(prc);
        } catch (err) {
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredItems = useMemo(() => {
        if (!search) return items;
        const s = search.toLowerCase();
        return items.filter(item => {
            const card = cards.find(c => c.id === item.cardProfileId);
            return card?.name.toLowerCase().includes(s) || card?.set.toLowerCase().includes(s);
        });
    }, [items, cards, search]);

    if (loading) {
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

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground">Manage your collection across all stages.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search cards..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button asChild>
                        <Link href="/inventory/add">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Link>
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-4 md:-mx-8">
                <div className="flex gap-4 p-4 md:px-8 pb-8 min-h-[calc(100vh-250px)]">
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="min-w-[280px] flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    {column.label}
                                    <Badge variant="secondary" className="text-[10px]">
                                        {filteredItems.filter(i => i.stage === column.id).length}
                                    </Badge>
                                </h3>
                            </div>

                            <div className="bg-accent/30 rounded-xl p-3 flex-1 space-y-3 border border-dashed border-muted-foreground/20">
                                {filteredItems
                                    .filter(i => i.stage === column.id)
                                    .map(item => (
                                        <ItemCard
                                            key={item.id}
                                            item={item}
                                            profile={cards.find(c => c.id === item.cardProfileId)}
                                            price={pricing.find(p => p.cardProfileId === item.cardProfileId)}
                                            onClick={() => setSelectedItem(item)}
                                        />
                                    ))}
                                {filteredItems.filter(i => i.stage === column.id).length === 0 && (
                                    <div className="h-20 flex items-center justify-center text-muted-foreground text-xs italic">
                                        No items
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <ItemDrawer
                isOpen={!!selectedItem}
                item={selectedItem}
                profile={cards.find(c => c.id === selectedItem?.cardProfileId)}
                onClose={() => setSelectedItem(null)}
                onUpdate={fetchData}
            />
        </div>
    );
}
