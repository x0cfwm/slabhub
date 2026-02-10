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
import { InventoryItem, MarketProduct, InventoryStage } from "@/lib/types";
import { ItemCard } from "./ItemCard";
import { StageColumn } from "./StageColumn";
import { COLUMNS, useDndSensors } from "./dnd";
import { updateInventoryItem } from "@/lib/api";
import { toast } from "sonner";

interface KanbanBoardProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    cards: MarketProduct[];
    onUpdate: () => void;
    onItemClick: (item: InventoryItem) => void;
}

export function KanbanBoard({ items, setItems, cards, onUpdate, onItemClick }: KanbanBoardProps) {
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
            await updateInventoryItem(itemId, { stage: newStage });
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
                            .map(item => {
                                const vid = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
                                const marketProduct = cards.find(p => p.id === vid) || item.cardProfile;

                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        profile={marketProduct as any}
                                        onClick={() => onItemClick(item)}
                                    />
                                );
                            })}
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
                {activeId && activeItem ? (() => {
                    const vid = (activeItem as any).cardVariantId || (activeItem as any).cardProfileId || activeItem.refPriceChartingProductId;
                    const marketProduct = cards.find(p => p.id === vid) || activeItem.cardProfile;

                    return (
                        <ItemCard
                            item={activeItem}
                            profile={marketProduct as any}
                            isOverlay
                        />
                    );
                })() : null}
            </DragOverlay>
        </DndContext>
    );
}
