"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Tag,
    Settings,
    Sparkles,
    Store
} from "lucide-react";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "Posting", href: "/posting", icon: Sparkles },
    { label: "Shop", href: "/shop", icon: Store },
    { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-md pb-safe">
            <nav className="flex justify-between items-center px-4 h-16">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
