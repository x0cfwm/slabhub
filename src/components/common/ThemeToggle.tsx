"use client";

import { useEffect, useState } from "react";
import { Sun, Terminal, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Theme, getStoredTheme, setStoredTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const storedTheme = getStoredTheme();
        setTheme(storedTheme);
    }, []);

    const toggleTheme = (checked: boolean) => {
        const newTheme = checked ? "cyberpunk" : "light";
        setTheme(newTheme);
        setStoredTheme(newTheme);
    };

    if (!mounted) {
        return <div className="h-12 w-full" />; // Placeholder to avoid layout shift
    }

    return (
        <div className="flex items-center gap-3 px-3 py-4 border-t border-border mt-auto">
            <div className={cn(
                "relative flex items-center justify-center h-9 w-9 rounded-lg border transition-all duration-300",
                theme === "light"
                    ? "bg-orange-50 border-orange-200 text-orange-500"
                    : "bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]"
            )}>
                {theme === "light" ? (
                    <Sun className="h-5 w-5 animate-in fade-in zoom-in duration-300" />
                ) : (
                    <Terminal className="h-5 w-5 animate-in fade-in zoom-in duration-300" />
                )}
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="theme-switch" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Interface
                </Label>
                <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-xs font-bold transition-colors",
                        theme === "cyberpunk" ? "text-primary" : "text-foreground"
                    )}>
                        {theme === "light" ? "Light" : "Cyberpunk"}
                    </span>
                    <Switch
                        id="theme-switch"
                        checked={theme === "cyberpunk"}
                        onCheckedChange={toggleTheme}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </div>
        </div>
    );
}
