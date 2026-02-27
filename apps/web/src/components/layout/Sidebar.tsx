"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Tag,
    Settings,
    ExternalLink,
    Send,
    Store
} from "lucide-react";

import { ThemeToggle } from "../common/ThemeToggle";
import { useAuth } from "../auth-provider";
import { LogOut, User as UserIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Logo } from "../common/Logo";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Pricing", href: "/pricing", icon: Tag },
    { label: "Shop", href: "/shop", icon: Store },
    { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className="hidden md:flex h-full w-64 flex-col border-r bg-card">
            <div className="p-6">
                <Link href="/dashboard" className="block">
                    <Logo />
                </Link>
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

            <ThemeToggle />

            {user && (
                <div className="p-4 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-none">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <UserIcon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                                    <span className="w-full truncate text-sm font-medium text-foreground">
                                        {user.profile?.shopName || user.email.split('@')[0]}
                                    </span>
                                    <span className="w-full truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/invites" className="cursor-pointer">
                                    <Send className="mr-2 h-4 w-4" />
                                    Invites
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                onClick={() => logout()}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}
