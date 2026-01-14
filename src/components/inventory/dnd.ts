import { InventoryStage } from "@/lib/types";
import {
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    CollisionDetection,
    rectIntersection,
    pointerWithin,
    closestCenter
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export const COLUMNS: { id: InventoryStage; label: string }[] = [
    { id: "ACQUIRED", label: "Acquired" },
    { id: "IN_TRANSIT", label: "In Transit" },
    { id: "IN_STOCK_UNGRADED", label: "In Stock" },
    { id: "BEING_GRADED", label: "Grading" },
    { id: "UNGRADED_FOR_SALE", label: "For Sale" },
    { id: "GRADED_FOR_SALE", label: "Graded Sale" },
];

export const STAGES = COLUMNS.map(c => c.id);

export function useDndSensors() {
    return useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
}
