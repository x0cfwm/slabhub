"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getStoredTheme } from "@/lib/theme";

export function Logo({ className }: { className?: string }) {
    const [theme, setTheme] = useState<string>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Initial theme
        setTheme(getStoredTheme());

        // Listen for theme changes (custom event or interval since we don't have a context)
        const checkTheme = () => {
            const currentTheme = getStoredTheme();
            if (currentTheme !== theme) {
                setTheme(currentTheme);
            }
        };

        const interval = setInterval(checkTheme, 500);
        return () => clearInterval(interval);
    }, [theme]);

    if (!mounted) {
        return <div className={className} style={{ height: "40px" }} />;
    }

    // Determine which logo to use
    // Dark theme and Cyberpunk use the white SLAB logo
    // Light theme uses the black SLAB logo
    const isDark = theme === "dark" || theme === "cyberpunk";
    const src = isDark ? "/logo-dark.svg" : "/logo-light.svg";

    return (
        <div className={className}>
            <Image
                src={src}
                alt="SlabHub"
                width={124}
                height={32}
                className="h-8 w-auto object-contain"
                priority
            />
        </div>
    );
}
