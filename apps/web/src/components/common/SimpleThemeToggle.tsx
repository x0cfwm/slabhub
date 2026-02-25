"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function SimpleThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center rounded-lg p-2 h-9 w-9" />
        );
    }

    const isDark = theme === "dark" || theme === "cyberpunk";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
    );
}
