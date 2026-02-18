"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function HeroWaitlistForm() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        console.log("Waitlist signup:", email);
        setSubmitted(true);
    }

    if (submitted) {
        return (
            <p className="text-base font-medium text-primary">
                {"You're on the list."}
            </p>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex w-full max-w-lg items-center rounded-2xl border px-2 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5 border-black/[0.10] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.12] dark:bg-black/30 dark:shadow-none"
        >
            <label htmlFor="hero-waitlist-email" className="sr-only">
                Email Address
            </label>
            <input
                id="hero-waitlist-email"
                type="email"
                required
                placeholder="Email Address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm outline-none sm:pl-4 sm:text-base text-[#0C0C0C] placeholder:text-[#9CA3AF] dark:text-foreground dark:placeholder:text-muted-foreground"
                aria-label="Email Address"
            />
            <Button
                type="submit"
                className="shrink-0 rounded-full bg-[#FBAC00] px-5 py-2.5 text-sm font-semibold text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_32px_rgba(251,172,0,0.3)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50 sm:px-6"
            >
                Get Early Access
            </Button>
        </form>
    );
}
