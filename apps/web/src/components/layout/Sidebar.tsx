"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Settings,
    Send,
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
import { APP_NAV_ITEMS } from "./navigation";

interface SidebarProps {
    isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div 
            className={cn(
                "hidden md:flex h-full flex-col border-r bg-card transition-all duration-300",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className={cn("p-6 flex flex-col transition-all duration-300", isCollapsed ? "items-center px-4" : "items-start")}>
                <Link href="/dashboard" className={cn("transition-all duration-300", isCollapsed ? "w-10" : "w-full")}>
                    <Logo iconOnly={isCollapsed} />
                </Link>
            </div>
            <nav className={cn("flex-1 px-4 space-y-2", isCollapsed && "flex flex-col items-center")}>
                {APP_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                                isCollapsed && "h-10 w-10 justify-center px-0 rounded-xl"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className={cn("px-4 py-4 border-t flex flex-col gap-4 transition-all duration-300", isCollapsed && "items-center")}>
                <ThemeToggle iconOnly={isCollapsed} />

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-none",
                                isCollapsed && "justify-center px-0"
                            )}>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                    <UserIcon className="h-4 w-4" />
                                </div>
                                {!isCollapsed && (
                                    <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                                        <span className="w-full truncate text-sm font-medium text-foreground">
                                            {user.profile?.shopName || user.email.split('@')[0]}
                                        </span>
                                        <span className="w-full truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? "start" : "end"} className="w-56" side={isCollapsed ? "right" : "top"}>
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
                )}
            </div>
        </div>
    );
}
