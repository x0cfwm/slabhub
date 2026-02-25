"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getVendorPage } from "@/lib/api";
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { ShoppingCart, MessageSquare, Info, ChevronLeft, ChevronRight, Maximize2, X, Share2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { SimpleThemeToggle } from "@/components/common/SimpleThemeToggle";

export default function VendorClient() {
    const searchParams = useSearchParams();
    const handle = searchParams.get("handle") || searchParams.get("name") || "";

    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [activePhoto, setActivePhoto] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

    const allPhotos = useMemo(() => {
        if (!selectedItem) return [];
        const uploadedPhotos = selectedItem.photos?.filter(Boolean) || [];

        if (uploadedPhotos.length > 0) {
            return uploadedPhotos;
        }

        // Fallback to default imagery only if no custom photos are uploaded
        const front = (selectedItem as any).frontMediaUrl;
        const vid = (selectedItem as any).cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId;
        const mp = marketProducts.find(p => p.id === vid);
        const bProfileImage = mp?.imageUrl;

        const res = [];
        if (front) res.push(front);
        if (bProfileImage && !res.includes(bProfileImage)) res.push(bProfileImage);

        return res;
    }, [selectedItem, marketProducts]);

    useEffect(() => {
        if (allPhotos.length > 0) {
            setActivePhoto(allPhotos[0]);
        } else {
            setActivePhoto(null);
        }
    }, [allPhotos]);
    useEffect(() => {
        if (!selectedItem) {
            setIsZoomed(false);
        }
    }, [selectedItem]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    useEffect(() => {
        if (!handle) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getVendorPage(handle);

                setProfile(data.profile);
                setItems(data.items);

                // Extract market products from items to satisfy existing logic
                const extractedMarketProducts: MarketProduct[] = data.items
                    .filter(i => (i as any).cardProfile)
                    .map(i => {
                        const cp = (i as any).cardProfile;
                        const pr = (i as any).pricing;
                        return {
                            id: (i as any).cardVariantId || (i as any).refPriceChartingProductId,
                            name: cp.name,
                            number: cp.cardNumber || "",
                            set: cp.set,
                            rarity: cp.rarity,
                            cardNumber: cp.cardNumber,
                            imageUrl: cp.imageUrl,
                            rawPrice: pr?.rawPrice || 0,
                            sealedPrice: pr?.sealedPrice || 0,
                            lastUpdated: pr?.updatedAt || new Date().toISOString(),
                            source: pr?.source || "Unknown",
                        } as MarketProduct;
                    });

                setMarketProducts(extractedMarketProducts);
            } catch (err) {
                console.error("Vendor page error:", err);
                setProfile(null);
                setItems([]);
                // No toast here as we show "Vendor not found" in UI
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
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background relative">
                <div className="absolute top-4 right-4">
                    <SimpleThemeToggle />
                </div>
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
                                {(profile as any).facebookVerifiedAt && (
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 cursor-pointer" onClick={() => window.open((profile as any).facebookProfileUrl, '_blank')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook mr-1.5 h-3 w-3"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                        Verified profile by Facebook
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0 items-center">
                            <SimpleThemeToggle />
                            <Button onClick={copyLink} variant="outline" className="flex-1 md:flex-none border-border">
                                <Share2 className="h-4 w-4 mr-2" /> Share
                            </Button>
                            {profile.socials.instagram && (
                                <Button variant="outline" size="icon" className="border-border" onClick={() => window.open(`https://instagram.com/${profile.socials.instagram}`, '_blank')}>
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
                                    <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedItem(item)}>
                                        <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <Card className="relative overflow-hidden transition-all rounded-2xl shadow-sm hover:shadow-md border-primary/10 bg-card/50 backdrop-blur-md">
                                            <div className="aspect-[3/4] overflow-hidden relative bg-accent/5">
                                                <img
                                                    src={item.photos?.[0] || (item as any).frontMediaUrl || marketProduct?.imageUrl || "https://placehold.co/300x400?text=Asset"}
                                                    className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-110"
                                                    alt={displayName}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                                    <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] truncate">{marketProduct?.set || "TCG Asset"}</p>
                                                </div>
                                            </div>
                                            <CardContent className="p-3 space-y-3">
                                                <div>
                                                    <h4 className="font-bold text-[13px] tracking-tight group-hover:text-primary transition-colors leading-tight">{displayName}</h4>
                                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                        {item.quantity > 1 && (
                                                            <Badge className="text-[9px] h-4 px-2 uppercase font-black bg-primary text-black">
                                                                {item.quantity} In Stock
                                                            </Badge>
                                                        )}
                                                        {(item as any).condition && !isSealed && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-2 font-bold border-primary/20">
                                                                {(item as any).condition}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-2.5 border-t border-border flex items-center justify-between">
                                                    <div className="text-left">
                                                        <span className="text-[9px] text-primary uppercase font-black block leading-none mb-1">Price</span>
                                                        <span className="text-base font-black tracking-tighter leading-none">${Math.round(item.listingPrice || 0).toLocaleString()}</span>
                                                    </div>
                                                    {(item as any).grade && (
                                                        <Badge variant="outline" className="text-[10px] h-5 px-2 font-bold border-primary/20 bg-primary/5 text-primary">
                                                            {(item as any).gradingCompany} {(item as any).grade}
                                                        </Badge>
                                                    )}
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

            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent showCloseButton={false} className="max-w-[98vw] md:max-w-7xl w-full h-[95vh] md:h-[90vh] p-0 gap-0 border-none bg-black overflow-hidden rounded-none md:rounded-[2.5rem] shadow-2xl">
                    {selectedItem ? (
                        <div className="flex flex-col md:flex-row h-full w-full">
                            {/* Left Side: Immersive Image Gallery */}
                            <div className="flex-[1.4] relative bg-[#0a0a0a] flex flex-col min-h-0">
                                {/* Main Image Area */}
                                <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

                                    <div
                                        className="absolute inset-0 flex items-center justify-center p-4 md:p-12 z-10 transition-all duration-700 animate-in fade-in zoom-in-95 overflow-hidden"
                                        onMouseMove={handleMouseMove}
                                        onMouseLeave={() => setIsZoomed(false)}
                                    >
                                        <div
                                            className={cn(
                                                "relative transition-transform duration-500 ease-out cursor-zoom-in flex items-center justify-center",
                                                isZoomed && "scale-[2.5] cursor-zoom-out"
                                            )}
                                            style={isZoomed ? {
                                                transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                                                width: '100%',
                                                height: '100%'
                                            } : {
                                                width: '100%',
                                                height: '100%'
                                            }}
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        >
                                            <img
                                                src={activePhoto || `https://placehold.co/800x1200?text=${((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? 'Sealed' : 'Card'}`}
                                                alt={((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? (selectedItem as any).productName : (marketProducts.find(p => p.id === ((selectedItem as any).cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.name || "Asset Details")}
                                                className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {/* Navigation Arrows */}
                                    {allPhotos.length > 1 && (
                                        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl pointer-events-auto border border-white/10 text-white transition-all hover:scale-110 active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const idx = allPhotos.indexOf(activePhoto || "");
                                                    const prevIdx = (idx - 1 + allPhotos.length) % allPhotos.length;
                                                    setActivePhoto(allPhotos[prevIdx]);
                                                }}
                                            >
                                                <ChevronLeft className="h-8 w-8" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl pointer-events-auto border border-white/10 text-white transition-all hover:scale-110 active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const idx = allPhotos.indexOf(activePhoto || "");
                                                    const nextIdx = (idx + 1) % allPhotos.length;
                                                    setActivePhoto(allPhotos[nextIdx]);
                                                }}
                                            >
                                                <ChevronRight className="h-8 w-8" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Bottom Thumbnails Strip */}
                                    {allPhotos.length > 1 && (
                                        <div className="absolute bottom-8 inset-x-0 flex justify-center z-20">
                                            <div className="bg-white/5 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 flex gap-2">
                                                {allPhotos.map((photo, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActivePhoto(photo)}
                                                        className={cn(
                                                            "relative w-12 h-16 rounded-lg overflow-hidden border-2 transition-all",
                                                            activePhoto === photo ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                                                        )}
                                                    >
                                                        <img src={photo} className="w-full h-full object-cover" alt="prev" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Content & Sales Details */}
                            <div className="flex-1 bg-card flex flex-col min-h-0 border-l border-white/5 relative">
                                {/* Fixed Header in Panel */}
                                <div className="p-6 md:p-10 border-b border-border/50">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start gap-12">
                                            <div className="space-y-1">
                                                <DialogDescription asChild>
                                                    <p className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] animate-in slide-in-from-left duration-500">
                                                        {marketProducts.find(p => p.id === (selectedItem.cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.set || "TCG Asset"}
                                                    </p>
                                                </DialogDescription>
                                                <DialogTitle asChild>
                                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                                                        {((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? (selectedItem as any).productName : (marketProducts.find(p => p.id === (selectedItem.cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.name || "Asset Details")}
                                                    </h2>
                                                </DialogTitle>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                <button
                                                    className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                                                    onClick={() => setSelectedItem(null)}
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedItem.quantity > 1 && (
                                                <Badge className="bg-primary hover:bg-primary text-black font-black uppercase text-[10px] py-1 px-3 rounded-md">
                                                    {selectedItem.quantity} In Stock
                                                </Badge>
                                            )}
                                            {(selectedItem as any).grade && (
                                                <Badge variant="secondary" className="font-bold bg-muted/50 text-foreground text-[10px] py-1 px-3 border border-border">
                                                    {(selectedItem as any).gradingCompany} {(selectedItem as any).grade}
                                                </Badge>
                                            )}
                                            {(selectedItem as any).condition && !((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") && (
                                                <Badge variant="outline" className="font-bold border-primary/20 text-primary text-[10px] py-1 px-3 bg-primary/5">
                                                    {(selectedItem as any).condition}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Body */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
                                    {/* Pricing Block */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-accent/5 rounded-[2rem] p-6 border border-primary/10 relative overflow-hidden group hover:border-primary/30 transition-colors">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <ShoppingCart className="h-8 w-8 text-primary" />
                                            </div>
                                            <span className="text-[10px] text-primary uppercase font-black block mb-2 tracking-widest">SlabHub Price</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black tracking-tighter">
                                                    ${Math.round(selectedItem.listingPrice || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-muted/10 rounded-[2rem] p-6 border border-border/50">
                                            <span className="text-[10px] text-muted-foreground uppercase font-black block mb-2 tracking-widest">Market Value</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-muted-foreground tracking-tight">
                                                    ${Math.round((((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? marketProducts.find(p => p.id === (selectedItem.cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.sealedPrice : marketProducts.find(p => p.id === (selectedItem.cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.rawPrice) || 0).toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-black">EST.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {(selectedItem as any).sellingDescription && (
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Info className="h-3 w-3" /> Seller's Description
                                            </h3>
                                            <div className="text-[13px] leading-relaxed text-foreground bg-muted/5 p-6 rounded-2xl border border-border/50 italic border-l-4 border-l-primary/50">
                                                "{(selectedItem as any).sellingDescription}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Seller info Mini */}
                                    <div className="p-6 bg-muted/30 rounded-2xl border border-border flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-xl font-black text-white">
                                            {profile.shopName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{profile.shopName}</p>
                                            <p className="text-xs text-muted-foreground">@{profile.handle} • {profile.locationCity}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="p-6 md:p-10 border-t border-border/50 bg-background/50 backdrop-blur-xl">
                                    <Button className="w-full h-16 text-lg font-black rounded-2xl shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] gap-3 hover:scale-[1.02] active:scale-95 transition-all bg-primary hover:bg-primary/90 text-black">
                                        <MessageSquare className="h-6 w-6" />
                                        Inquire About Purchase
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
