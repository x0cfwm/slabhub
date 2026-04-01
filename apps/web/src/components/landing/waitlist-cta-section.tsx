"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { joinWaitlist } from "@/lib/api";

export function WaitlistCTASection() {
    const { user, loading } = useAuth();

    return (
        <section id="waitlist" className="relative overflow-hidden px-4 py-20 lg:px-8 lg:py-28">
            {/* ── Bottom-up amber ground fog ── */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(180,130,0,0.5) 0%, rgba(200,150,0,0.3) 25%, rgba(180,130,0,0.12) 50%, transparent 75%)",
                }}
            />

            <div className="relative mx-auto max-w-2xl text-center">
                {/* Headline */}
                <h2 className="font-display text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    {user ? "Revisit your shop" : "Ready to master the market?"}
                    <br />
                    {user ? "Manage your inventory" : "Get started for free today"}
                </h2>

                {/* Form */}
                <div className="mx-auto mt-10 max-w-lg">
                    {loading ? (
                        <div className="h-[58px] w-full max-w-lg" />
                    ) : (
                        <Button
                            size="lg"
                            className="rounded-full bg-[#FBAC00] px-10 py-7 text-lg font-bold text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_32px_rgba(251,172,0,0.3)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
                            asChild
                        >
                            <Link href={user ? "/dashboard" : "/login"}>
                                {user ? "Go to Dashboard" : "Get Started Now"}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
