"use client";

import { useEffect, useState } from "react";
import { getInventoryHistory } from "@/lib/api";
import { WorkflowStatus, InventoryStage } from "@/lib/types";
import { format } from "date-fns";
import { Loader2, History, ArrowRight, Circle } from "lucide-react";

interface HistoryEntry {
    id: string;
    type: string;
    fromStage: InventoryStage | null;
    toStage: InventoryStage | null;
    fromStatusId: string | null;
    toStatusId: string | null;
    notes: string | null;
    createdAt: string;
}

interface InventoryHistoryTabProps {
    itemId: string;
    statuses: WorkflowStatus[];
}

export function InventoryHistoryTab({ itemId, statuses }: InventoryHistoryTabProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getInventoryHistory(itemId);
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [itemId]);

    const getStatusName = (id: string | null) => {
        if (!id) return "None";
        return statuses.find(s => s.id === id)?.name || id;
    };

    const getStatusColor = (id: string | null) => {
        if (!id) return "#94a3b8";
        return statuses.find(s => s.id === id)?.color || "#94a3b8";
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <History className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">No history yet</h3>
                    <p className="text-sm text-muted-foreground max-w-[240px]">
                        Any changes to this item's workflow status will be tracked here.
                    </p>
                </div>
            </div>
        );
    }

    // Ensure history is strictly sorted by date descending before grouping
    const sortedHistory = [...history].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groupedHistory = sortedHistory.reduce((groups: { [key: string]: HistoryEntry[] }, entry) => {
        const dateKey = format(new Date(entry.createdAt), "MMM d, yyyy");
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(entry);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedHistory).sort((a, b) => 
        new Date(groupedHistory[b][0].createdAt).getTime() - new Date(groupedHistory[a][0].createdAt).getTime()
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary/10 before:to-transparent">
                {sortedDates.map((dateKey, gIdx) => (
                    <div key={dateKey} className="relative space-y-4">
                        <div className="flex items-center justify-between pl-10 pr-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                {dateKey}
                            </span>
                            {gIdx === 0 && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                                    Latest
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {groupedHistory[dateKey].map((entry) => (
                                <div key={entry.id} className="relative group pl-10">
                                    {/* Timeline Connector Bullet */}
                                    <div className="absolute left-5 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-primary bg-background z-10 group-hover:scale-125 transition-all duration-200" />
                                    
                                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 shadow-sm group-hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            {/* Time Column - Moved to Left */}
                                            <div className="flex flex-col items-center justify-center py-1 pr-4 border-r border-primary/10 shrink-0 min-w-[55px]">
                                                <span className="text-[10px] font-bold font-mono opacity-40">
                                                    {format(new Date(entry.createdAt), "HH:mm")}
                                                </span>
                                            </div>

                                            {/* Status Transition Content */}
                                            <div className="flex-1 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 max-w-[45%]">
                                                    <div 
                                                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                        style={{ backgroundColor: getStatusColor(entry.fromStatusId) }}
                                                    />
                                                    <span className="text-xs font-semibold truncate opacity-70">
                                                        {getStatusName(entry.fromStatusId)}
                                                    </span>
                                                </div>
                                                
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-40" />
                                                
                                                <div className="flex items-center gap-2 max-w-[45%] text-right justify-end">
                                                    <span className="text-xs font-bold truncate">
                                                        {getStatusName(entry.toStatusId)}
                                                    </span>
                                                    <div 
                                                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                        style={{ backgroundColor: getStatusColor(entry.toStatusId) }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-3 bg-muted/20 rounded-xl border border-dashed border-primary/5 flex items-center justify-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Item Created on {format(new Date(history[history.length-1].createdAt), "PPPP")}</p>
            </div>
        </div>
    );
}
