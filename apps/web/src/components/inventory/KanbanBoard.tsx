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
import { updateInventoryItem, reorderInventoryItems } from "@/lib/api";
import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";

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

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeItem = items.find(i => i.id === activeId);
        if (!activeItem) return;

        let newItems = [...items];
        const isColumn = COLUMNS.some(c => c.id === overId);

        if (isColumn) {
            const newStage = overId as InventoryStage;
            if (activeItem.stage !== newStage) {
                // Moving to a column (end of it)
                newItems = newItems.map(i => i.id === activeId ? { ...i, stage: newStage } : i);
                // Move it to the end of the new column in the array for correct sortOrder calculation
                const itemToMove = newItems.find(i => i.id === activeId)!;
                const otherItems = newItems.filter(i => i.id !== activeId);
                newItems = [...otherItems, itemToMove];
            }
        } else {
            const overItem = items.find(i => i.id === overId);
            if (overItem) {
                const activeIndex = newItems.findIndex(i => i.id === activeId);
                const overIndex = newItems.findIndex(i => i.id === overId);

                if (activeItem.stage !== overItem.stage) {
                    // Moving to a different column at a specific position
                    newItems[activeIndex] = { ...activeItem, stage: overItem.stage };
                    newItems = arrayMove(newItems, activeIndex, overIndex);
                } else if (activeIndex !== overIndex) {
                    // Reordering within the same column
                    newItems = arrayMove(newItems, activeIndex, overIndex);
                } else {
                    return; // No change
                }
            }
        }

        // Calculate new sort orders based on the new array positions
        // We group by stage and assign incrementing sortOrder
        const itemsByStage: Record<string, InventoryItem[]> = {};
        COLUMNS.forEach(c => {
            itemsByStage[c.id] = newItems.filter(i => i.stage === c.id);
        });

        const updates: { id: string; sortOrder: number; stage: InventoryStage }[] = [];
        const updatedNewItems = [...newItems];

        Object.keys(itemsByStage).forEach(stage => {
            itemsByStage[stage].forEach((item, index) => {
                updates.push({
                    id: item.id,
                    sortOrder: index,
                    stage: stage as InventoryStage
                });

                // Update the item in the local array to reflect new sortOrder
                const itemIndex = updatedNewItems.findIndex(i => i.id === item.id);
                if (itemIndex !== -1) {
                    updatedNewItems[itemIndex] = {
                        ...updatedNewItems[itemIndex],
                        sortOrder: index,
                        stage: stage as InventoryStage
                    };
                }
            });
        });

        // Optimistic UI update
        const oldItems = items;
        // Since KanbanBoard might be receiving a filtered list, 
        // we should try to preserve the other items if possible.
        // But since we are passing setItems from the parent, 
        // we need to be careful. The parent passes setItems(inv) where inv is the full list.
        setItems(prev => {
            const result = [...prev];
            updatedNewItems.forEach(updated => {
                const idx = result.findIndex(i => i.id === updated.id);
                if (idx !== -1) {
                    result[idx] = updated;
                }
            });
            return result;
        });

        try {
            await reorderInventoryItems(updates);
        } catch (err) {
            toast.error("Failed to save new order.");
            setItems(oldItems);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex justify-start lg:justify-center gap-4 p-4 md:px-8 pb-8 min-h-[calc(100vh-250px)] max-w-[2000px] mx-auto">
                {COLUMNS.map((column) => (
                    <StageColumn
                        key={column.id}
                        id={column.id}
                        label={column.label}
                        count={items.filter(i => i.stage === column.id).length}
                        itemIds={items.filter(i => i.stage === column.id).map(i => i.id)}
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
                        <div className="w-40 md:w-44">
                            <div className="p-3">
                                <ItemCard
                                    item={activeItem}
                                    profile={marketProduct as any}
                                    isOverlay
                                />
                            </div>
                        </div>
                    );
                })() : null}
            </DragOverlay>
        </DndContext>
    );
}
