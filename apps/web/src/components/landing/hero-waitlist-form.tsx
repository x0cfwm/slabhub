"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function HeroWaitlistForm() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="h-[58px] w-full max-w-lg" />;
    }

    if (user) {
        return (
            <Button
                size="lg"
                className="rounded-full bg-[#FBAC00] px-10 py-7 text-lg font-bold text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_32px_rgba(251,172,0,0.3)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
                asChild
            >
                <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
        );
    }



    return (
        <Button
            size="lg"
            className="rounded-full bg-[#FBAC00] px-10 py-7 text-lg font-bold text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_32px_rgba(251,172,0,0.3)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
            asChild
        >
            <Link href="/login">Get Started</Link>
        </Button>
    );
}
