"use client";

import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    rectIntersection
} from "@dnd-kit/core";
import { InventoryItem, CardProfile, PricingSnapshot, InventoryStage } from "@/lib/types";
import { ItemCard } from "./ItemCard";
import { StageColumn } from "./StageColumn";
import { COLUMNS, useDndSensors } from "./dnd";
import { mockApi } from "@/lib/mockApi";
import { toast } from "sonner";

interface KanbanBoardProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    cards: CardProfile[];
    pricing: PricingSnapshot[];
    onUpdate: () => void;
    onItemClick: (item: InventoryItem) => void;
}

export function KanbanBoard({ items, setItems, cards, pricing, onUpdate, onItemClick }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useDndSensors();

    const activeItem = items.find(i => i.id === activeId);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const itemId = active.id as string;
        const newStage = over.id as InventoryStage;
        const item = items.find(i => i.id === itemId);

        if (!item || item.stage === newStage) return;

        const oldStage = item.stage;

        // Optimistic UI update
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: newStage } : i));

        try {
            await mockApi.updateInventoryItem(itemId, { stage: newStage });
            // Optionally refreshing from source to ensure sequence/sorting is right
            // onUpdate(); 
        } catch (err) {
            toast.error("Failed to move item. Connection lost.");
            // Rollback
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, stage: oldStage } : i));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 p-4 md:px-8 pb-8 min-h-[calc(100vh-250px)]">
                {COLUMNS.map((column) => (
                    <StageColumn
                        key={column.id}
                        id={column.id}
                        label={column.label}
                        count={items.filter(i => i.stage === column.id).length}
                    >
                        {items
                            .filter(i => i.stage === column.id)
                            .map(item => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    profile={cards.find(c => {
                                        const vid = (item as any).cardVariantId || (item as any).cardProfileId;
                                        const bid = vid?.includes("-") ? vid.split("-")[0] : vid;
                                        return c.id === bid;
                                    })}
                                    price={pricing.find(p => {
                                        const vid = (item as any).cardVariantId || (item as any).cardProfileId;
                                        const bid = vid?.includes("-") ? vid.split("-")[0] : vid;
                                        return p.cardProfileId === bid || p.cardProfileId === vid;
                                    })}
                                    onClick={() => onItemClick(item)}
                                />
                            ))}
                    </StageColumn>
                ))}
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: "0.5",
                        },
                    },
                }),
            }}>
                {activeId && activeItem ? (
                    <ItemCard
                        item={activeItem}
                        profile={cards.find(c => {
                            const vid = (activeItem as any).cardVariantId || (activeItem as any).cardProfileId;
                            const bid = vid?.includes("-") ? vid.split("-")[0] : vid;
                            return c.id === bid;
                        })}
                        price={pricing.find(p => {
                            const vid = (activeItem as any).cardVariantId || (activeItem as any).cardProfileId;
                            const bid = vid?.includes("-") ? vid.split("-")[0] : vid;
                            return p.cardProfileId === bid || p.cardProfileId === vid;
                        })}
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
