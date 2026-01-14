"use client";

import { useEffect, useState } from "react";
import { mockApi } from "@/lib/mockApi";
import { PricingSnapshot, CardProfile } from "@/lib/types";
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
import { RefreshCw, TrendingUp, TrendingDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricingPage() {
    const [pricing, setPricing] = useState<PricingSnapshot[]>([]);
    const [cards, setCards] = useState<CardProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        try {
            const [prc, crd] = await Promise.all([
                mockApi.listPricing(),
                mockApi.listCardProfiles()
            ]);
            setPricing(prc);
            setCards(crd);
        } catch (err) {
            toast.error("Failed to fetch prices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const newPricing = await mockApi.refreshPricing();
            setPricing(newPricing);
            toast.success("Market prices updated!");
        } catch (err) {
            toast.error("Failed to refresh pricing");
        } finally {
            setRefreshing(false);
        }
    };

    const filteredCards = cards.filter(card =>
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        card.cardNumber.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[500px] w-full" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Market Pricing</h1>
                    <p className="text-muted-foreground">Global reference prices for all card profiles.</p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-full md:w-auto"
                >
                    <RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                    Update Market Data
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search card profiles..."
                        className="pl-8"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Card</TableHead>
                            <TableHead>Card Name</TableHead>
                            <TableHead>Set</TableHead>
                            <TableHead>Raw Price</TableHead>
                            <TableHead>Sealed Price</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCards.map((card) => {
                            const price = pricing.find(p => p.cardProfileId === card.id);
                            return (
                                <TableRow key={card.id}>
                                    <TableCell>
                                        <img src={card.imageUrl} className="h-12 w-auto rounded shadow-sm" alt="" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{card.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{card.cardNumber}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{card.set}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-semibold">
                                            ${price?.rawPrice.toFixed(2)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {price?.sealedPrice ? `$${price.sealedPrice.toFixed(2)}` : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] text-muted-foreground">
                                        {price ? new Date(price.updatedAt).toLocaleTimeString() : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                            {price?.source}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
