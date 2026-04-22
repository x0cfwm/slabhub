"use client";

import Link from "next/link";
import { ExternalLink, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";
import { cn } from "@/lib/utils";

interface TopbarProps {
    onToggleSidebar?: () => void;
    isSidebarCollapsed?: boolean;
}

export function Topbar({ onToggleSidebar, isSidebarCollapsed }: TopbarProps) {
    const { user } = useAuth();
    const profile = user?.profile;

    return (
        <header className="h-16 border-b bg-card px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={onToggleSidebar}
                >
                    <PanelLeft className={cn("h-5 w-5 transition-transform", isSidebarCollapsed && "rotate-180")} />
                </Button>
                <h2 className="font-semibold">{profile?.shopName || "SlabHub"}</h2>
            </div>
            <div className="flex items-center gap-2">
                {profile?.isActive && (
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/vendor/${profile.handle}`} target="_blank">
                            View Public Page
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>
        </header>
    );
}
