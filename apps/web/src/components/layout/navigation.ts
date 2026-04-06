import type { LucideIcon } from "lucide-react";
import {
    Bot,
    LayoutDashboard,
    Package,
    Settings,
    Sparkles,
    Store,
    Tag
} from "lucide-react";

export interface AppNavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    desktopOnly?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "Posting", href: "/posting", icon: Sparkles },
    { label: "Shop", href: "/shop", icon: Store },
    { label: "MCP", href: "/mcp", icon: Bot, desktopOnly: true },
    { label: "Settings", href: "/settings", icon: Settings },
];

export const MOBILE_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => !item.desktopOnly);
