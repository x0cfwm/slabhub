"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { listInventory, getMarketProducts, getMe } from "@/lib/api";
import { InventoryItem, MarketProduct, SellerProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    MapPin,
    CreditCard,
    Truck,
    Users,
    Instagram,
    Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VendorClient() {
    const searchParams = useSearchParams();
    const handle = searchParams.get("handle") || searchParams.get("name") || "";

    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profRes, inv, market] = await Promise.all([
                    getMe(),
                    listInventory(),
                    getMarketProducts({ page: 1, limit: 100 })
                ]);

                // In real app, we would fetch by handle. Mock just gets current user.
                setProfile(profRes?.profile || null);
                setItems(inv.filter(i =>
                    i.stage === "LISTED"
                ));
                setMarketProducts(market.items);
            } catch (err) {
                toast.error("Failed to load vendor page");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [handle]);

    const filteredItems = useMemo(() => {
        const s = search.toLowerCase();
        return items.filter(item => {
            const vid = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
            const card = marketProducts.find(c => c.id === vid);

            if (!search) return true;

            const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
            if (itType === "SEALED_PRODUCT" || itType === "SEALED") {
                return (item as any).productName?.toLowerCase().includes(s);
            }

            return card?.name.toLowerCase().includes(s) || card?.set.toLowerCase().includes(s);
        });
    }, [items, marketProducts, search]);

    if (loading) return <div className="p-8 text-center text-primary-foreground/50">Loading public page...</div>;
    if (!profile) return <div className="p-8 text-center text-primary-foreground/50">Vendor not found</div>;

    if (!profile.isActive) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-background">
                <Card className="max-w-md w-full text-center p-8 space-y-4 border-border bg-card shadow-lg">
                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Shop Inactive</CardTitle>
                    <p className="text-muted-foreground italic">
                        "{profile.shopName}" is currently not accepting new orders or inquiries.
                        Please check back later or contact the seller directly.
                    </p>
                    <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
                </Card>
            </div>
        );
    }

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header / Shop Info */}
            <div className="bg-gradient-to-b from-primary/5 whitespace-nowrap to-transparent border-b">
                <div className="max-w-6xl mx-auto px-4 py-16">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-28 h-28 bg-primary rounded-3xl flex items-center justify-center text-4xl font-black text-white border-4 border-primary/20 rotate-3 shadow-xl">
                            {profile.shopName.charAt(0)}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter">
                                    {profile.shopName}
                                </h1>
                                <p className="text-primary/70 flex items-center gap-1 mt-2 font-bold tracking-widest uppercase text-xs">
                                    @{profile.handle} • <MapPin className="h-3 w-3" /> {profile.locationCity}, {profile.locationCountry}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {profile.meetupsEnabled && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                        <Users className="h-3 w-3 mr-1" /> Meetups
                                    </Badge>
                                )}
                                {profile.shippingEnabled && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                        <Truck className="h-3 w-3 mr-1" /> Shipping
                                    </Badge>
                                )}
                                <Badge variant="outline" className="border-border bg-muted/50">
                                    <CreditCard className="h-3 w-3 mr-1" /> {profile.paymentsAccepted.join(", ")}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0">
                            <Button onClick={copyLink} variant="outline" className="flex-1 md:flex-none border-border">
                                <Instagram className="h-4 w-4 mr-2" /> Share
                            </Button>
                            {profile.socials.instagram && (
                                <Button variant="outline" size="icon" className="border-border">
                                    <Instagram className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-12">
                <Tabs defaultValue="for-sale" className="space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b pb-6">
                        <TabsList className="p-1 rounded-xl">
                            <TabsTrigger value="for-sale" className="px-10 py-2.5 rounded-lg font-bold uppercase text-xs tracking-widest transition-all">
                                Items For Sale
                            </TabsTrigger>
                            <TabsTrigger value="wishlist" className="px-10 py-2.5 rounded-lg font-bold uppercase text-xs tracking-widest transition-all">
                                Wishlist
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search inventory..."
                                className="pl-10 focus:border-primary/50 transition-all h-10"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <TabsContent value="for-sale">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredItems.map(item => {
                                const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
                                const isSealed = itType === "SEALED_PRODUCT" || itType === "SEALED";

                                const vid = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
                                const marketProduct = marketProducts.find(p => p.id === vid);

                                const marketPrice = isSealed ? marketProduct?.sealedPrice : marketProduct?.rawPrice;
                                const displayName = isSealed ? (item as any).productName : marketProduct?.name || "Unknown Asset";

                                return (
                                    <div key={item.id} className="group relative">
                                        <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <Card className="relative overflow-hidden transition-all rounded-2xl shadow-sm hover:shadow-md border-primary/10 bg-card/50 backdrop-blur-md">
                                            <div className="aspect-[3/4] overflow-hidden relative bg-accent/5">
                                                <img
                                                    src={marketProduct?.imageUrl || "https://placehold.co/300x400?text=Asset"}
                                                    className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-110 p-4"
                                                    alt={displayName}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/50 to-transparent">
                                                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] truncate">{marketProduct?.set || "TCG Asset"}</p>
                                                </div>
                                            </div>
                                            <CardContent className="p-4 space-y-4">
                                                <div>
                                                    <h4 className="font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">{displayName}</h4>
                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                        <Badge className="text-[9px] h-4 px-2 uppercase font-black bg-primary text-black">
                                                            {item.quantity} In Stock
                                                        </Badge>
                                                        {(item as any).grade && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-2 font-bold border-primary/20 bg-primary/5 text-primary">
                                                                {(item as any).gradingCompany} {(item as any).grade}
                                                            </Badge>
                                                        )}
                                                        {(item as any).condition && !isSealed && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-2 font-bold border-primary/20">
                                                                {(item as any).condition}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-border flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Market Avg</span>
                                                        <span className="text-xs font-medium text-muted-foreground line-through">${marketPrice?.toFixed(2) || "0.00"}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-primary uppercase font-black block leading-none mb-0.5">Price</span>
                                                        <span className="text-lg font-black tracking-tighter">${item.listingPrice?.toFixed(2) || (item.acquisitionPrice * 1.2).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                        {filteredItems.length === 0 && (
                            <div className="text-center py-32 bg-muted/30 rounded-[2rem] border-2 border-dashed">
                                <p className="text-muted-foreground font-medium italic text-lg">No items currently for sale.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="wishlist">
                        <Card className="border-border bg-gradient-to-br from-card to-muted/20 rounded-[2.5rem] p-8 md:p-16">
                            <CardHeader className="text-center pb-12 border-b">
                                <div className="w-16 h-1 bg-primary mx-auto mb-8 rounded-full"></div>
                                <CardTitle className="text-4xl font-black uppercase tracking-tighter">Looking For / Wishlist</CardTitle>
                                <CardDescription className="text-lg font-medium text-muted-foreground mt-4">Contact this seller if you have these items available for trade or sale.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-12">
                                <div className="whitespace-pre-wrap font-medium text-2xl leading-relaxed text-muted-foreground text-center italic">
                                    "{profile.wishlistText || "No wishlist items specified yet."}"
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
