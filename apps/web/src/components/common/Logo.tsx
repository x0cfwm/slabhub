"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
}

export function Logo({ className, iconOnly }: LogoProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={className} style={{ height: "40px" }} />;
    }

    // Determine which logo to use
    const isDark = theme === "dark" || theme === "cyberpunk";
    const src = isDark ? "/logo-dark.svg" : "/logo-light.svg";

    if (iconOnly) {
        return (
            <div className={cn("flex items-center justify-center h-10 w-10 bg-primary/10 rounded-xl overflow-hidden ring-1 ring-primary/20", className)}>
                <div className="text-primary font-black text-xl italic">S</div>
            </div>
        );
    }

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
