import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StageColumnProps {
    id: string;
    label: string;
    count: number;
    color?: string;
    children: React.ReactNode;
    itemIds: string[];
    scale?: "compact" | "normal" | "large";
}

export function StageColumn({ id, label, count, color, children, itemIds, scale = "normal" }: StageColumnProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div className={cn(
            "shrink-0 flex flex-col gap-4 transition-all duration-300",
            scale === "compact" ? "w-40 md:w-44" : scale === "large" ? "w-56 md:w-64" : "w-48 md:w-52"
        )}>
            <div className="flex items-center justify-between px-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 min-w-0 w-full overflow-hidden">
                    <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color || '#94a3b8' }}
                    />
                    <span className="truncate flex-1" title={label}>{label}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                        {count}
                    </Badge>
                </h3>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    "bg-accent/30 rounded-xl p-3 flex-1 space-y-3 border border-dashed transition-colors",
                    isOver ? "bg-accent/50 border-primary/40" : "border-muted-foreground/20"
                )}
            >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {children}
                </SortableContext>
                {count === 0 && !isOver && (
                    <div className="h-20 flex items-center justify-center text-muted-foreground text-xs italic">
                        No items
                    </div>
                )}
                {isOver && count === 0 && (
                    <div className="h-20 border-2 border-dashed border-primary/20 rounded-lg flex items-center justify-center text-primary/40 text-xs">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    );
}
