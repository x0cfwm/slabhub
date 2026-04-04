import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    DndContext,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    rectIntersection
} from "@dnd-kit/core";
import { InventoryItem, MarketProduct, InventoryStage, WorkflowStatus } from "@/lib/types";
import { ItemCard } from "./ItemCard";
import { StageColumn } from "./StageColumn";
import { useDndSensors } from "./dnd";
import { updateInventoryItem, reorderInventoryItems } from "@/lib/api";
import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";
import { SoldPromptDialog } from "./SoldPromptDialog";
import { ListedPromptDialog } from "./ListedPromptDialog";

interface KanbanBoardProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    cards: MarketProduct[];
    onUpdate: () => void;
    onItemClick: (item: InventoryItem) => void;
    statuses: WorkflowStatus[];
    scale?: "compact" | "normal" | "large";
}

export function KanbanBoard({ items, setItems, cards, onUpdate, onItemClick, statuses, scale = "normal" }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [promptItem, setPromptItem] = useState<{ id: string, name: string, statusId: string, listingPrice?: number } | null>(null);
    const [listedPromptItem, setListedPromptItem] = useState<{ id: string, name: string, statusId: string } | null>(null);
    const sensors = useDndSensors();

    const activeItem = items.find(i => i.id === activeId);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;
        const isColumn = statuses.some(s => s.id === over.id) || over.id === "UNCATEGORIZED";
        const activeId = active.id as string;
        const overId = over.id as string;

        const activeItem = items.find(i => i.id === activeId);
        if (!activeItem) return;

        const targetStatusId = isColumn ? overId : items.find(i => i.id === overId)?.statusId;
        const targetStatus = statuses.find(s => s.id === targetStatusId);

        // If dropping into "UNCATEGORIZED" column, we don't move there (this column is catch-all)
        if (targetStatusId === "UNCATEGORIZED") return;

        if (targetStatus?.systemId === "SOLD" && activeItem.status?.systemId !== "SOLD") {
            const vid = (activeItem as any).cardVariantId || (activeItem as any).cardProfileId || activeItem.refPriceChartingProductId;
            const marketProduct = cards.find(p => p.id === vid) || activeItem.cardProfile;
            setPromptItem({ 
                id: activeId, 
                name: marketProduct?.name || "Card", 
                statusId: targetStatusId!,
                listingPrice: activeItem.listingPrice ? Number(activeItem.listingPrice) : undefined
            });
            return;
        }

        if (targetStatus?.systemId === "LISTED" && activeItem.status?.systemId !== "LISTED") {
            const vid = (activeItem as any).cardVariantId || (activeItem as any).cardProfileId || activeItem.refPriceChartingProductId;
            const marketProduct = cards.find(p => p.id === vid) || activeItem.cardProfile;
            setListedPromptItem({ id: activeId, name: marketProduct?.name || "Card", statusId: targetStatusId! });
            return;
        }

        await finalizeDrop(items, activeId, overId, isColumn);
    };

    const finalizeDrop = async (currentItems: InventoryItem[], activeId: string, overId: string, isColumn: boolean, extraData: any = {}) => {
        const activeItem = currentItems.find(i => i.id === activeId);
        if (!activeItem) return;

        let newItems = [...currentItems];
        if (isColumn) {
            const newStatusId = overId;
            if (activeItem.statusId !== newStatusId) {
                newItems = newItems.map(i => i.id === activeId ? { ...i, ...extraData, statusId: newStatusId } : i);
                const itemToMove = newItems.find(i => i.id === activeId)!;
                const otherItems = newItems.filter(i => i.id !== activeId);
                newItems = [...otherItems, itemToMove];
            }
        } else {
            const overItem = items.find(i => i.id === overId);
            if (overItem) {
                const activeIndex = newItems.findIndex(i => i.id === activeId);
                const overIndex = newItems.findIndex(i => i.id === overId);

                if (activeItem.statusId !== overItem.statusId) {
                    newItems[activeIndex] = { ...activeItem, ...extraData, statusId: overItem.statusId };
                    newItems = arrayMove(newItems, activeIndex, overIndex);
                } else if (activeIndex !== overIndex) {
                    newItems = arrayMove(newItems, activeIndex, overIndex);
                } else {
                    return;
                }
            }
        }

        // Calculate new sort orders and update stage enum based on systemId
        const updates: { id: string; sortOrder: number; stage: InventoryStage; statusId: string }[] = [];
        const updatedNewItems = [...newItems];

        statuses.forEach(status => {
            const columnItems = updatedNewItems.filter(i => i.statusId === status.id);
            columnItems.forEach((item, index) => {
                const newStage = (status.systemId as InventoryStage) || item.stage;
                updates.push({
                    id: item.id,
                    sortOrder: index,
                    stage: newStage,
                    statusId: status.id
                });

                const itemIndex = updatedNewItems.findIndex(i => i.id === item.id);
                if (itemIndex !== -1) {
                    updatedNewItems[itemIndex] = {
                        ...updatedNewItems[itemIndex],
                        sortOrder: index,
                        statusId: status.id,
                        stage: newStage
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
            <div className="flex justify-start lg:justify-center gap-4 p-4 md:px-8 pb-8 min-h-[calc(100vh-250px)] max-w-[2000px] mx-auto overflow-x-auto">
                {items.some(i => !i.statusId) && (
                    <StageColumn
                        id="UNCATEGORIZED"
                        label="Uncategorized"
                        color="#64748b"
                        count={items.filter(i => !i.statusId).length}
                        itemIds={items.filter(i => !i.statusId).map(i => i.id)}
                        scale={scale}
                    >
                        {items
                            .filter(i => !i.statusId)
                            .map(item => {
                                const vid = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
                                const marketProduct = cards.find(p => p.id === vid) || item.cardProfile;
                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        profile={marketProduct as any}
                                        onClick={() => onItemClick(item)}
                                        scale={scale}
                                    />
                                );
                            })}
                    </StageColumn>
                )}
                {statuses.filter(s => s.showOnKanban).map((status) => (
                    <StageColumn
                        key={status.id}
                        id={status.id}
                        label={status.name}
                        color={status.color || undefined}
                        count={items.filter(i => i.statusId === status.id).length}
                        itemIds={items.filter(i => i.statusId === status.id).map(i => i.id)}
                        scale={scale}
                    >
                        {items
                            .filter(i => i.statusId === status.id)
                            .map(item => {
                                const vid = (item as any).cardVariantId || (item as any).cardProfileId || item.refPriceChartingProductId;
                                const marketProduct = cards.find(p => p.id === vid) || item.cardProfile;

                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        profile={marketProduct as any}
                                        onClick={() => onItemClick(item)}
                                        scale={scale}
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
                        <div className={cn(
                            "transition-all duration-300",
                            scale === "compact" ? "w-40 md:w-44" : scale === "large" ? "w-56 md:w-64" : "w-48 md:w-52"
                        )}>
                            <div className="p-3">
                                <ItemCard
                                    item={activeItem}
                                    profile={marketProduct as any}
                                    isOverlay
                                    scale={scale}
                                />
                            </div>
                        </div>
                    );
                })() : null}
            </DragOverlay>

            <SoldPromptDialog
                key={promptItem?.id}
                isOpen={!!promptItem}
                itemName={promptItem?.name}
                listingPrice={promptItem?.listingPrice}
                onClose={() => setPromptItem(null)}
                onConfirm={async (data) => {
                    if (promptItem) {
                        try {
                            await finalizeDrop(items, promptItem.id, promptItem.statusId, true, {
                                soldPrice: data.soldPrice,
                                soldDate: data.soldDate,
                                stage: "SOLD"
                            });
                            await updateInventoryItem(promptItem.id, {
                                stage: "SOLD",
                                soldPrice: data.soldPrice,
                                soldDate: data.soldDate,
                            });
                            onUpdate();
                        } catch (err) {
                            toast.error("Failed to mark as sold");
                        }
                    }
                }}
            />

            <ListedPromptDialog
                key={listedPromptItem?.id}
                isOpen={!!listedPromptItem}
                itemName={listedPromptItem?.name}
                item={items.find(i => i.id === listedPromptItem?.id)}
                onClose={() => setListedPromptItem(null)}
                onConfirm={async (data) => {
                    if (listedPromptItem) {
                        try {
                            await finalizeDrop(items, listedPromptItem.id, listedPromptItem.statusId, true, {
                                listingPrice: data.listingPrice,
                                sellingDescription: data.sellingDescription,
                                stage: "LISTED"
                            });
                            await updateInventoryItem(listedPromptItem.id, {
                                stage: "LISTED",
                                listingPrice: data.listingPrice,
                                sellingDescription: data.sellingDescription,
                                statusId: listedPromptItem.statusId
                            });
                            onUpdate();
                        } catch (err) {
                            toast.error("Failed to list item");
                        }
                    }
                }}
            />
        </DndContext>
    );
}
