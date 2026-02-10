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

    const itemType = (item as any).type || (item as any).itemType || "UNKNOWN";
    const isSealed = itemType === "SEALED_PRODUCT" || itemType === "SEALED";

    // Extract variant info if present
    const variantId = (item as any).cardVariantId || (item as any).cardProfileId || "";
    const isNewVariantId = variantId.includes("-");
    const variantType = isNewVariantId ? variantId.split("-")[1] : "NORMAL";
    const language = isNewVariantId ? variantId.split("-")[2] : "EN";

    const marketPrice = isSealed ? price?.sealedPrice : price?.rawPrice;
    const finalProfile = profile || item.cardProfile;

    // Type-specific display values
    const displayName = isSealed
        ? (item as any).productName || finalProfile?.name || "Unknown Product"
        : finalProfile?.name || "Unknown Asset";

    const displaySub = isSealed
        ? (item as any).productType || "Sealed Product"
        : finalProfile?.set || "Unknown Set";

    const typeLabel = itemType.replace("SINGLE_CARD_", "").replace("_PRODUCT", "");

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
                "group cursor-grab active:cursor-grabbing hover:shadow-md transition-all overflow-hidden border-muted-foreground/10 py-0 gap-0",
                isDragging && !isOverlay && "opacity-40 grayscale-[0.5]",
                isOverlay && "shadow-2xl ring-2 ring-primary/20 cursor-grabbing",
                item.type === "SINGLE_CARD_GRADED" && "border-primary/20 bg-primary/5"
            )}
            onClick={(e) => {
                if (onClick) onClick();
            }}
        >
            <div className="relative pointer-events-none">
                <AspectRatio ratio={1 / 1}>
                    <div className="flex items-center justify-center w-full h-full bg-accent/10 relative overflow-hidden">
                        <img
                            src={finalProfile?.imageUrl || `https://placehold.co/300x400?text=${isSealed ? 'Sealed' : 'Card'}`}
                            alt={displayName}
                            className={cn(
                                "object-contain w-full h-full transition-all duration-500 group-hover:scale-110 p-2",
                                variantType === "ALTERNATE_ART" && "hue-rotate-15 saturate-110",
                                variantType === "PARALLEL_FOIL" && "contrast-125 brightness-110"
                            )}
                        />
                        {variantType === "PARALLEL_FOIL" && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/20 pointer-events-none animate-pulse" />
                        )}
                        {variantType !== "NORMAL" && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none mix-blend-overlay" />
                        )}
                        {isNewVariantId && (
                            <div className="absolute bottom-2 left-2">
                                <Badge className="bg-black/60 backdrop-blur-md text-[8px] px-1 py-0 h-4 border-white/10 text-white select-none">
                                    {language}
                                </Badge>
                            </div>
                        )}
                    </div>
                </AspectRatio>
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge variant="secondary" className="backdrop-blur-md bg-white/50 text-[8px] uppercase font-bold">
                        {typeLabel}
                    </Badge>
                    {item.type === "SINGLE_CARD_GRADED" && (
                        <Badge className="bg-blue-600 text-[8px] font-mono">
                            {item.gradingCompany} {item.grade}
                        </Badge>
                    )}
                    {item.type === "SINGLE_CARD_RAW" && (
                        <Badge variant="outline" className="bg-background/80 text-[8px] font-bold">
                            {item.condition}
                        </Badge>
                    )}
                </div>
            </div>
            <CardContent className="p-3 space-y-2 pointer-events-none">
                <div className="min-w-0">
                    <h4 className="font-bold text-xs line-clamp-2 leading-tight h-8 mb-0.5">{displayName}</h4>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-tight truncate">{displaySub}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-muted">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-[7px] uppercase font-bold">Market</span>
                        <span className="font-bold text-primary text-[10px]">
                            {typeof marketPrice === 'number' ? `$${marketPrice.toFixed(2)}` : "N/A"}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            {item.quantity > 1 && (
                                <Badge variant="outline" className="h-4 px-1 text-[7px] border-primary/30 text-primary">
                                    x{item.quantity}
                                </Badge>
                            )}
                            <span className="text-muted-foreground text-[7px] uppercase font-bold text-black border px-1 rounded-sm bg-accent">Cost</span>
                        </div>
                        <span className="font-bold text-[10px]">
                            ${(Number(item.acquisitionPrice) || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
                {item.type === "SINGLE_CARD_GRADED" && (
                    <div className="text-[7px] font-mono text-muted-foreground truncate border-t border-muted/50 pt-1">
                        CERT: {item.certNumber}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
