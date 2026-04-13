"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getVendorPage, trackEvent } from "@/lib/api";
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
    Link as LinkIcon,
    Calendar,
    ExternalLink,
    ShoppingCart,
    MessageSquare,
    Info,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    X,
    Share2,
    Heart,
    CheckCircle2,
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
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { SimpleThemeToggle } from "@/components/common/SimpleThemeToggle";
import { getOptimizedImageUrl } from "@/lib/image-utils";

export default function VendorClient() {
    const searchParams = useSearchParams();
    const handle = searchParams.get("handle") || searchParams.get("name") || "";

    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [listedStatuses, setListedStatuses] = useState<{ id: string; name: string }[]>([]);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("");

    // Sync selected item state with URL on initial load and browser navigation
    useEffect(() => {
        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get("itemId");
            if (items.length > 0) {
                const item = items.find(i => i.id === id);
                setSelectedItem(item || null);
            }
            const tabParam = params.get("tab");
            if (tabParam) {
                setActiveTab(tabParam);
            }
        };

        syncFromUrl();
        window.addEventListener("popstate", syncFromUrl);
        return () => window.removeEventListener("popstate", syncFromUrl);
    }, [items]);

    // Initial Page View Tracking
    useEffect(() => {
        if (profile?.handle) {
            trackEvent({ type: 'VIEW_SHOP', handle: profile.handle });
        }
    }, [profile?.handle]);

    const handleOpenItem = (item: InventoryItem | null) => {
        setSelectedItem(item);
        const url = new URL(window.location.href);
        if (item) {
            url.searchParams.set("itemId", item.id);
            if (profile?.handle) {
                trackEvent({ type: 'VIEW_ITEM', handle: profile.handle, itemId: item.id });
            }
        } else {
            url.searchParams.delete("itemId");
        }
        // Update URL without triggering Next.js RSC fetch
        window.history.pushState(null, "", url.toString());
    };

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", val);
        window.history.replaceState(null, "", url.toString());
    };
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
                setListedStatuses(data.listedStatuses || []);

                const currentTabParam = new URLSearchParams(window.location.search).get("tab");
                if (currentTabParam) {
                    setActiveTab(currentTabParam);
                } else if (data.listedStatuses && data.listedStatuses.length > 0) {
                    setActiveTab(data.listedStatuses[0].id);
                } else {
                    setActiveTab("for-sale");
                }

                // Extract market products from items to satisfy existing logic
                const extractedMarketProducts: MarketProduct[] = data.items
                    .filter(i => (i as any).cardProfile)
                    .map(i => {
                        const cp = (i as any).cardProfile;
                        return {
                            id: (i as any).cardVariantId || (i as any).refPriceChartingProductId,
                            name: cp.name,
                            number: cp.cardNumber || "",
                            set: cp.set,
                            rarity: cp.rarity,
                            cardNumber: cp.cardNumber,
                            imageUrl: cp.imageUrl,
                            rawPrice: cp.rawPrice || 0,
                            sealedPrice: cp.sealedPrice || 0,
                            lastUpdated: (i as any).updatedAt || new Date().toISOString(),
                            source: "SlabHub",
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
            if (!search) return true;

            const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
            const profile = (item as any).cardProfile;

            if (itType === "SEALED_PRODUCT" || itType === "SEALED") {
                return (item as any).productName?.toLowerCase().includes(s);
            }

            return profile?.name.toLowerCase().includes(s) || profile?.set.toLowerCase().includes(s);
        });
    }, [items, search]);

    const currentItemIndex = useMemo(() =>
        selectedItem ? filteredItems.findIndex(i => i.id === selectedItem.id) : -1
        , [selectedItem, filteredItems]);

    const handleNextItem = () => {
        if (currentItemIndex === -1 || filteredItems.length <= 1) return;
        const nextIndex = (currentItemIndex + 1) % filteredItems.length;
        handleOpenItem(filteredItems[nextIndex]);
    };

    const handlePrevItem = () => {
        if (currentItemIndex === -1 || filteredItems.length <= 1) return;
        const prevIndex = (currentItemIndex - 1 + filteredItems.length) % filteredItems.length;
        handleOpenItem(filteredItems[prevIndex]);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedItem || isZoomed || isContactOpen) return;
            if (e.key === "ArrowRight") handleNextItem();
            if (e.key === "ArrowLeft") handlePrevItem();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedItem, currentItemIndex, filteredItems, isContactOpen]);

    const renderItemGrid = (itemsToRender: InventoryItem[]) => {
        return (
            <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {itemsToRender.map(item => {
                        const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
                        const isSealed = itType === "SEALED_PRODUCT" || itType === "SEALED";
                        const cardProfile = (item as any).cardProfile;

                        const displayName = isSealed ? (item as any).productName : cardProfile?.name || "Unknown Asset";
                        const displaySub = isSealed ? "Sealed Product" : cardProfile?.set || "TCG Asset";

                        return (
                            <div key={item.id} className="group relative cursor-pointer" onClick={() => handleOpenItem(item)}>
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                <Card className={cn(
                                    "relative overflow-hidden transition-all rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-md border py-0 gap-0",
                                    itType === "SINGLE_CARD_GRADED" && "ring-1 ring-primary/20 bg-primary/[0.02]"
                                )}>
                                    <div className="aspect-[2.5/3.5] overflow-hidden relative bg-accent/5 flex items-center justify-center p-2">
                                        <img
                                            src={getOptimizedImageUrl(item.photos?.[0] || (item as any).frontMediaUrl || cardProfile?.imageUrl || "https://placehold.co/300x400?text=Asset", { height: 800 })}
                                            className="object-contain w-full h-full transition-all duration-700 group-hover:scale-105"
                                            alt={displayName}
                                        />
                                        
                                        {/* Status Badges - Top Right */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none z-10">
                                            <Badge variant="secondary" className="backdrop-blur-md bg-white/70 dark:bg-black/70 text-[8px] uppercase font-bold border-none">
                                                {itType.replace("SINGLE_CARD_", "").replace("_PRODUCT", "")}
                                            </Badge>
                                            {(item as any).grade && (
                                                <Badge className="bg-primary text-black text-[8px] font-bold border-none shadow-sm">
                                                    {(item as any).gradingCompany} {(item as any).grade}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <CardContent className="p-3 md:p-4 space-y-2.5">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[13px] tracking-tight group-hover:text-primary transition-colors leading-[1.2rem] line-clamp-2 min-h-[2.4rem]">{displayName}</h4>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate font-medium opacity-70">
                                                {displaySub}
                                            </p>
                                        </div>

                                        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
                                            <div className="text-left">
                                                <span className="text-base font-black tracking-tight leading-none">${Math.round(item.listingPrice || 0).toLocaleString()}</span>
                                            </div>
                                            
                                            {item.quantity > 1 ? (
                                                <Badge variant="outline" className="text-[9px] h-5 px-1.5 uppercase font-bold border-primary/20 text-primary">
                                                    x{item.quantity} Stock
                                                </Badge>
                                            ) : (
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase">1 in stock</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
                {itemsToRender.length === 0 && (
                    <div className="text-center py-32 bg-muted/30 rounded-[2rem] border-2 border-dashed">
                        <p className="text-muted-foreground font-medium italic text-lg">No items currently for sale.</p>
                    </div>
                )}
            </>
        );
    };


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
            <div className="bg-muted/30 border-b relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-center text-center md:text-left">
                        {profile.avatarUrl ? (
                            <img
                                src={getOptimizedImageUrl(profile.avatarUrl, { width: 400, height: 400, fit: 'cover' })}
                                alt={profile.shopName}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover ring-4 ring-primary/10 shadow-2xl transition-transform hover:scale-105"
                            />
                        ) : (
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-primary rounded-3xl flex items-center justify-center text-4xl font-black text-white ring-4 ring-primary/10 shadow-2xl">
                                {profile.shopName.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3 justify-center md:justify-start">
                                    {profile.shopName}
                                    <CheckCircle2 className="h-6 w-6 text-blue-500 fill-blue-500/10" />
                                </h1>
                                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1.5 mt-1 font-bold tracking-wider uppercase text-[10px] md:text-xs">
                                    <span className="text-primary/70">@{profile.handle}</span>
                                    {profile.location && (
                                        <>
                                            <span className="opacity-50">•</span>
                                            <MapPin className="h-3 w-3 inline" />
                                            {profile.location}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                                {(profile.fulfillmentOptions || []).includes("shipping") && (
                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                                        <Truck className="h-3 w-3 mr-1" /> Shipping
                                    </Badge>
                                )}
                                {(profile.fulfillmentOptions || []).includes("meetups_local") && (
                                    <Badge variant="secondary" className="bg-blue-500/5 text-blue-500 border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                        <Users className="h-3 w-3 mr-1" /> Local Meetups
                                    </Badge>
                                )}
                                {profile.paymentsAccepted && profile.paymentsAccepted.length > 0 && (
                                    <Badge variant="outline" className="border-border bg-muted/30">
                                        <CreditCard className="h-3 w-3 mr-1" /> {profile.paymentsAccepted.join(", ")}
                                    </Badge>
                                )}
                                {(profile as any).facebookVerifiedAt && (
                                    <Badge title="Visit Facebook Profile" variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer border-none shadow-sm" onClick={() => window.open((profile as any).facebookProfileUrl, '_blank')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook mr-1.5 h-3 w-3"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                        Verified
                                        <ExternalLink className="ml-1.5 h-3 w-3 opacity-90" />
                                    </Badge>
                                )}
                            </div>

                            {/* Compact Info Section */}
                            {(profile.referenceLinks?.length > 0 || profile.upcomingEvents?.length > 0) && (
                                <div className="flex flex-col md:flex-row gap-4 pt-2">
                                    {profile.referenceLinks?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1">Links:</span>
                                            {profile.referenceLinks.map((link: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 rounded-lg text-[11px] font-bold text-primary border border-primary/20 transition-all"
                                                >
                                                    <LinkIcon className="h-2.5 w-2.5" />
                                                    {link.title}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {profile.upcomingEvents?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1">Events:</span>
                                            {profile.upcomingEvents.map((event: any, idx: number) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-lg text-[11px] border border-border/50">
                                                    <Calendar className="h-2.5 w-2.5 text-primary" />
                                                    <span className="font-bold">{event.name}</span>
                                                    {event.date && <span className="text-muted-foreground opacity-60">• {event.date}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto pt-6 md:pt-0 items-center justify-center md:justify-end">
                            <SimpleThemeToggle />
                            <Button onClick={copyLink} variant="outline" className="flex-1 md:flex-none h-11 rounded-xl border-border hover:bg-accent group">
                                <Share2 className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" /> Share Shop
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-12">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20 p-2 md:p-3 rounded-[2rem] border border-border/50">
                        <TabsList className="bg-background/50 backdrop-blur-sm p-1 rounded-2xl w-full md:w-auto overflow-x-auto flex flex-nowrap [&::-webkit-scrollbar]:hidden">
                            {listedStatuses.length > 0 ? (
                                listedStatuses.map((status) => (
                                    <TabsTrigger key={status.id} value={status.id} className="flex-none px-6 md:px-10 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        {status.name}
                                    </TabsTrigger>
                                ))
                            ) : (
                                <TabsTrigger value="for-sale" className="flex-1 md:flex-none px-6 md:px-10 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Items For Sale
                                </TabsTrigger>
                            )}
                            {filteredItems.some(i => !listedStatuses.find(s => s.id === i.statusId)) && listedStatuses.length > 0 && (
                                <TabsTrigger value="other" className="flex-none px-6 md:px-10 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Other
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="wishlist" className="flex-none md:flex-none px-6 md:px-10 py-2.5 rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                Wishlist
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative w-full md:w-72 shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search inventory..."
                                className="pl-11 pr-4 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11 rounded-2xl md:min-w-[300px]"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {listedStatuses.length > 0 ? (
                        <>
                            {listedStatuses.map((status) => {
                                const statusItems = filteredItems.filter(i => i.statusId === status.id);
                                return (
                                    <TabsContent key={status.id} value={status.id}>
                                        {renderItemGrid(statusItems)}
                                    </TabsContent>
                                );
                            })}
                            {filteredItems.some(i => !listedStatuses.find(s => s.id === i.statusId)) && (
                                <TabsContent value="other">
                                    {renderItemGrid(filteredItems.filter(i => !listedStatuses.find(s => s.id === i.statusId)))}
                                </TabsContent>
                            )}
                        </>
                    ) : (
                        <TabsContent value="for-sale">
                            {renderItemGrid(filteredItems)}
                        </TabsContent>
                    )}

                    <TabsContent value="wishlist">
                        <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30 rounded-[2.5rem] overflow-hidden shadow-xl">
                            <CardHeader className="text-center pt-16 pb-12 bg-muted/20 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--primary),0.05),transparent)] pointer-events-none" />
                                <Heart className="h-12 w-12 text-primary mx-auto mb-6 fill-primary/10 animate-pulse" />
                                <CardTitle className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Sellers' Wishlist</CardTitle>
                                <CardDescription className="text-base md:text-lg font-medium text-muted-foreground max-w-xl mx-auto mt-4 px-6">
                                    I'm actively looking for these items. Contact me if you have them available for trade or sale!
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 md:p-16">
                                <div className="max-w-3xl mx-auto whitespace-pre-wrap font-medium text-xl md:text-3xl leading-relaxed text-foreground text-center italic opacity-90">
                                    "{profile.wishlistText || "No wishlist items specified yet."}"
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && handleOpenItem(null)}>
                <DialogContent showCloseButton={false} className="max-w-[100vw] md:max-w-7xl w-full h-[100vh] md:h-[90vh] p-0 gap-0 border-none bg-background md:bg-black overflow-hidden rounded-none md:rounded-[2.5rem] shadow-2xl">
                    <div className="relative h-full w-full flex flex-col overflow-hidden">
                        {selectedItem ? (
                            <div className="flex flex-col md:flex-row h-full w-full min-h-0">
                                {/* Left Side: Immersive Image Gallery */}
                                <div className="flex-[1.4] relative bg-[#0a0a0a] flex flex-col h-full overflow-hidden border-b md:border-b-0">
                                    {/* Main Image Area */}
                                    <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />

                                        <div
                                            className="absolute inset-0 flex items-center justify-center p-6 md:p-12 z-10 transition-all duration-700 animate-in fade-in zoom-in-95"
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={() => setIsZoomed(false)}
                                        >
                                            <div
                                                className={cn(
                                                    "relative transition-transform duration-500 ease-out cursor-zoom-in flex items-center justify-center w-full h-full",
                                                    isZoomed && "scale-[2.5] cursor-zoom-out"
                                                )}
                                                style={isZoomed ? {
                                                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                                                } : undefined}
                                                onClick={() => setIsZoomed(!isZoomed)}
                                            >
                                                <img
                                                    src={getOptimizedImageUrl(activePhoto || `https://placehold.co/800x1200?text=${((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? 'Sealed' : 'Card'}`, { height: 1200 })}
                                                    alt={((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? (selectedItem as any).productName : (marketProducts.find(p => p.id === ((selectedItem as any).cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.name || "Asset Details")}
                                                    className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-lg pointer-events-none"
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
                                                            <img src={getOptimizedImageUrl(photo, { width: 96, height: 128, fit: 'cover' })} className="w-full h-full object-cover" alt="prev" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Content & Sales Details */}
                                <div className="flex-1 bg-card flex flex-col h-full overflow-hidden border-l border-white/5 relative min-h-0">
                                    {/* Fixed Header in Panel */}
                                    <div className="p-6 md:p-10 border-b border-border/50 shrink-0">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start gap-12">
                                                <div className="space-y-1">
                                                    <DialogTitle asChild>
                                                        <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                                                            {((selectedItem as any).type === "SEALED_PRODUCT" || (selectedItem as any).itemType === "SEALED") ? (selectedItem as any).productName : (selectedItem as any).cardProfile?.name || "Asset Details"}
                                                        </h2>
                                                    </DialogTitle>
                                                    <DialogDescription asChild>
                                                        <p className="text-muted-foreground font-bold tracking-[0.1em] uppercase text-[11px] animate-in slide-in-from-left duration-500">
                                                            {(selectedItem as any).cardProfile?.set || "TCG Asset"}
                                                        </p>
                                                    </DialogDescription>
                                                </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border bg-background/50 backdrop-blur-sm" onClick={copyLink}>
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-full bg-muted/80 hover:bg-muted"
                                                            onClick={() => handleOpenItem(null)}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="secondary" className="backdrop-blur-md bg-muted text-[10px] py-1 px-3 uppercase font-bold text-foreground border border-border">
                                                    {((selectedItem as any).type || (selectedItem as any).itemType || "UNKNOWN").replace("SINGLE_CARD_", "").replace("_PRODUCT", "")}
                                                </Badge>
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
                                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 min-h-0">
                                        {/* Pricing Block */}
                                        <div className={cn(
                                            "grid gap-4",
                                            (selectedItem.marketPrice && selectedItem.marketPrice > 0) ? "grid-cols-2" : "grid-cols-1"
                                        )}>
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
                                            {selectedItem.marketPrice && selectedItem.marketPrice > 0 && (
                                                <div className="bg-muted/10 rounded-[2rem] p-6 border border-border/50">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-black block mb-2 tracking-widest">Market Value</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-bold text-muted-foreground tracking-tight">
                                                            ${Math.round(selectedItem.marketPrice || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-black">EST.</span>
                                                    </div>
                                                </div>
                                            )}
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

                                        <div className="p-5 bg-muted/20 rounded-2xl border border-border/50 flex items-center gap-4 transition-colors hover:bg-muted/30">
                                            {profile.avatarUrl ? (
                                                <img src={getOptimizedImageUrl(profile.avatarUrl, { width: 128, height: 128 })} className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/10" alt={profile.shopName} />
                                            ) : (
                                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-xl font-black text-white">
                                                    {profile.shopName.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold flex items-center gap-1.5">
                                                    {profile.shopName}
                                                    <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500/10" />
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 opacity-70">
                                                    @{profile.handle}
                                                    {profile.location && (
                                                        <>
                                                            {" • "}
                                                            {profile.location}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const hasContact = !!(profile.facebookProfileUrl || profile.email);
                                        
                                        if (!hasContact) return null;

                                        return (
                                            <div className="p-6 md:p-10 border-t border-border/50 bg-card/80 backdrop-blur-md shrink-0 sticky bottom-0 z-10 md:static">
                                                <Button
                                                    className="w-full h-14 md:h-16 text-base md:text-lg font-black rounded-2xl shadow-xl shadow-primary/10 gap-3 hover:scale-[1.01] active:scale-95 transition-all bg-primary hover:bg-primary/90 text-black border-none"
                                                    onClick={() => {
                                                        if (profile?.handle) {
                                                            trackEvent({ type: 'INQUIRY_START', handle: profile.handle, itemId: selectedItem?.id });
                                                        }
                                                        setIsContactOpen(true);
                                                    }}
                                                >
                                                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
                                                    Inquire About Purchase
                                                </Button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : null}

                        {/* Product Navigation Arrows (Edges) */}
                        {selectedItem && filteredItems.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between pointer-events-none z-50 px-4 md:px-8">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-xl pointer-events-auto border border-white/10 text-white transition-all hover:scale-110 active:scale-95 shadow-2xl"
                                    onClick={handlePrevItem}
                                >
                                    <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-xl pointer-events-auto border border-white/10 text-white transition-all hover:scale-110 active:scale-95 shadow-2xl"
                                    onClick={handleNextItem}
                                >
                                    <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Contact Bridge Modal */}
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-background rounded-[2.5rem] shadow-2xl">
                    <div className="relative p-8 space-y-8">
                        <div className="space-y-2 text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                                <MessageSquare className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight">Contact Seller</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium">
                                How would you like to inquire about this item?
                            </DialogDescription>
                        </div>

                        <div className="space-y-4">

                            <div className="grid grid-cols-1 gap-3">
                                {profile?.facebookProfileUrl ? (
                                    <Button
                                        className="w-full h-14 rounded-2xl bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold gap-3"
                                        onClick={() => {
                                            if (profile?.handle) {
                                                trackEvent({ type: 'INQUIRY_COMPLETE', handle: profile.handle, itemId: selectedItem?.id, channel: 'facebook' });
                                            }
                                            window.open(profile?.facebookProfileUrl || '', '_blank');
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                        Facebook profile
                                        <ExternalLink className="h-4 w-4 opacity-50 ml-auto" />
                                    </Button>
                                ) : profile?.email ? (
                                    <Button
                                        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black font-bold gap-3"
                                        onClick={() => {
                                            if (profile?.handle) {
                                                trackEvent({ type: 'INQUIRY_COMPLETE', handle: profile.handle, itemId: selectedItem?.id, channel: 'email' });
                                            }
                                            const itemName = selectedItem ? (
                                                (selectedItem as any).productName || 
                                                marketProducts.find(p => p.id === ((selectedItem as any).cardVariantId || (selectedItem as any).cardProfileId || selectedItem.refPriceChartingProductId))?.name || 
                                                "this item"
                                            ) : "an item";
                                            const price = selectedItem?.listingPrice ? ` ($${selectedItem.listingPrice})` : "";
                                            const subject = encodeURIComponent(`Inquiry about ${itemName} on SlabHub`);
                                            const body = encodeURIComponent(`Hi ${profile?.shopName},\n\nI'm interested in inquiring about "${itemName}"${price} that I saw on your SlabHub page.\n\nIs it still available?`);
                                            window.location.href = `mailto:${profile?.email}?subject=${subject}&body=${body}`;
                                        }}
                                    >
                                        <MessageSquare className="h-5 w-5" />
                                        Contact via email
                                        <ExternalLink className="h-4 w-4 opacity-50 ml-auto" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {(profile as any).facebookVerifiedAt && (
                            <div className="pt-4 border-t flex items-center justify-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-500"><path d="M20 6 9 17l-5-5"/></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified SlabHub Partner</span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
