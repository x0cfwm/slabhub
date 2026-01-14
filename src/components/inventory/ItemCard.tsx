"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardProfile, InventoryItem, PricingSnapshot } from "@/lib/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CreditCard, Tag } from "lucide-react";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface ItemCardProps {
    item: InventoryItem;
    profile?: CardProfile;
    price?: PricingSnapshot;
    onClick?: () => void;
    isOverlay?: boolean;
}

export function ItemCard({ item, profile, price, onClick, isOverlay }: ItemCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: {
            item,
        }
    });

    const marketPrice = item.itemType === "SEALED" ? price?.sealedPrice : price?.rawPrice;

    // Apply transform only if not in overlay (overlay handled by DndContext)
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow overflow-hidden border-muted-foreground/10",
                isDragging && !isOverlay && "opacity-40 grayscale-[0.5]",
                isOverlay && "shadow-2xl ring-2 ring-primary/20 cursor-grabbing"
            )}
            onClick={(e) => {
                // Prevent click if we were dragging
                if (onClick) onClick();
            }}
        >
            <div className="relative pointer-events-none">
                <AspectRatio ratio={1 / 1}>
                    <div className="flex items-center justify-center w-full h-full bg-accent/10">
                        <img
                            src={profile?.imageUrl || "https://placehold.co/300x400?text=No+Image"}
                            alt={profile?.name}
                            className="object-contain w-full h-full transition-transform group-hover:scale-110 p-2"
                        />
                    </div>
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
            <CardContent className="p-3 space-y-2 pointer-events-none">
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
