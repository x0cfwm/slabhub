"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Tag,
    Settings,
    ExternalLink
} from "lucide-react";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex h-full w-64 flex-col border-r bg-card">
            <div className="p-6">
                <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Package className="h-6 w-6" />
                    SlabHub CRM
                </h1>
            </div>
            <nav className="flex-1 space-y-2 px-4">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
