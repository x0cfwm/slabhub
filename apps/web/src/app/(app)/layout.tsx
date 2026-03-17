"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar_collapsed");
        if (saved === "true") setIsSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        const next = !isSidebarCollapsed;
        setIsSidebarCollapsed(next);
        localStorage.setItem("sidebar_collapsed", String(next));
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar isCollapsed={isSidebarCollapsed} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}
