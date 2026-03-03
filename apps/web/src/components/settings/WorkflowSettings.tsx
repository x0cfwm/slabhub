"use client";

import { useState, useEffect } from "react";
import {
    listStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses
} from "@/lib/api";
import { InventoryStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    GripVertical,
    Pencil,
    Check,
    X,
    LayoutDashboard
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SortableStatusItemProps {
    status: InventoryStatus;
    onEdit: (status: InventoryStatus) => void;
    onDelete: (status: InventoryStatus) => void;
}

function SortableStatusItem({ status, onEdit, onDelete }: SortableStatusItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: status.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
        >
            <div {...attributes} {...listeners} className="cursor-grab hover:text-primary transition-colors">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            <div
                className="w-4 h-4 rounded-full border shadow-sm"
                style={{ backgroundColor: status.color || '#94a3b8' }}
            />

            <span className="flex-1 font-medium">{status.name}</span>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(status)} className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(status)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export function WorkflowSettings() {
    const [statuses, setStatuses] = useState<InventoryStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [editingStatus, setEditingStatus] = useState<InventoryStatus | null>(null);
    const [deletingStatus, setDeletingStatus] = useState<InventoryStatus | null>(null);
    const [moveToStatusId, setMoveToStatusId] = useState<string>("");

    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("#94a3b8");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchStatuses = async () => {
        try {
            const data = await listStatuses();
            setStatuses(data);
        } catch (err) {
            toast.error("Failed to load statuses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setStatuses((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist to backend
                const updates = newItems.map((s, idx) => ({ id: s.id, position: idx }));
                reorderStatuses(updates).catch(() => {
                    toast.error("Failed to save order");
                    fetchStatuses();
                });

                return newItems;
            });
        }
    };

    const handleAdd = async () => {
        if (!newName) return;
        try {
            await createStatus({ name: newName, color: newColor });
            toast.success("Status added");
            setIsAddOpen(false);
            setNewName("");
            setNewColor("#94a3b8");
            fetchStatuses();
        } catch (err) {
            toast.error("Failed to add status");
        }
    };

    const handleUpdate = async () => {
        if (!editingStatus || !newName) return;
        try {
            await updateStatus(editingStatus.id, { name: newName, color: newColor });
            toast.success("Status updated");
            setIsEditOpen(false);
            setEditingStatus(null);
            setNewName("");
            setNewColor("#94a3b8");
            fetchStatuses();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!deletingStatus) return;
        try {
            await deleteStatus(deletingStatus.id, moveToStatusId);
            toast.success("Status deleted");
            setIsDeleteOpen(false);
            setDeletingStatus(null);
            setMoveToStatusId("");
            fetchStatuses();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete status");
        }
    };

    const openEdit = (status: InventoryStatus) => {
        setEditingStatus(status);
        setNewName(status.name);
        setNewColor(status.color || "#94a3b8");
        setIsEditOpen(true);
    };

    const openDelete = (status: InventoryStatus) => {
        setDeletingStatus(status);
        // Find a fallback status that isn't the one being deleted
        const fallback = statuses.find(s => s.id !== status.id);
        setMoveToStatusId(fallback?.id || "");
        setIsDeleteOpen(true);
    };

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Loading workflow...</div>;
    }

    return (
        <Card className="border-border bg-muted/30 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-muted-foreground uppercase text-[10px] tracking-[0.2em] font-bold flex items-center gap-2">
                        <LayoutDashboard className="h-3 w-3" />
                        CRM Workflow
                    </CardTitle>
                    <CardDescription>Customize your inventory stages and Kanban columns.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Status
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={statuses.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {statuses.map((status) => (
                                <SortableStatusItem
                                    key={status.id}
                                    status={status}
                                    onEdit={openEdit}
                                    onDelete={openDelete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Add Dialog */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Status</DialogTitle>
                            <DialogDescription>Create a new stage for your CRM workflow.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Status Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Listed – Instagram"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        className="w-12 h-10 p-1"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                    <Input
                                        placeholder="#94a3b8"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleAdd}>Create Status</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Status</DialogTitle>
                            <DialogDescription>Modify status name and color.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Status Name</Label>
                                <Input
                                    id="edit-name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-color">Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="edit-color"
                                        type="color"
                                        className="w-12 h-10 p-1"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                    <Input
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdate}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-destructive">Delete Status</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{deletingStatus?.name}"?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-sm">
                            <p className="text-muted-foreground bg-muted p-3 rounded border italic">
                                Note: Any items currently in this status must be moved to another one.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="move-to">Move existing items to:</Label>
                                <Select value={moveToStatusId} onValueChange={setMoveToStatusId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select replacement status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.filter(s => s.id !== deletingStatus?.id).map(status => (
                                            <SelectItem key={status.id} value={status.id}>
                                                {status.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete and Move Items</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
