"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardProfile, InventoryItem, PricingSnapshot } from "@/lib/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CreditCard, Tag } from "lucide-react";

interface ItemCardProps {
    item: InventoryItem;
    profile?: CardProfile;
    price?: PricingSnapshot;
    onClick?: () => void;
}

export function ItemCard({ item, profile, price, onClick }: ItemCardProps) {
    const marketPrice = item.itemType === "SEALED" ? price?.sealedPrice : price?.rawPrice;

    return (
        <Card
            className="group cursor-pointer hover:shadow-md transition-all overflow-hidden border-muted-foreground/10"
            onClick={onClick}
        >
            <div className="relative">
                <AspectRatio ratio={3 / 4}>
                    <img
                        src={profile?.imageUrl || "https://placehold.co/300x400?text=No+Image"}
                        alt={profile?.name}
                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                    />
                </AspectRatio>
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <Badge variant="secondary" className="backdrop-blur-md bg-white/50">
                        {item.itemType}
                    </Badge>
                    {item.gradeValue && (
                        <Badge className="bg-blue-600">
                            {item.gradeProvider} {item.gradeValue}
                        </Badge>
                    )}
                </div>
            </div>
            <CardContent className="p-3 space-y-2">
                <div>
                    <h4 className="font-semibold text-sm truncate leading-tight">{profile?.name || "Unknown"}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase">{profile?.set}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-muted">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-[8px] uppercase">Market</span>
                        <span className="font-bold text-primary">${marketPrice?.toFixed(2) || "N/A"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-muted-foreground text-[8px] uppercase font-bold text-black border px-1 rounded-sm bg-accent">Ask</span>
                        <span className="font-bold flex items-center">
                            {item.listingPrice ? `$${item.listingPrice.toFixed(2)}` : "-"}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
