"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

/* ─── Slide data ─── */
const slides = [
    {
        id: "kanban",
        label: "Inventory",
        image:
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image_2026-02-12_11-47-42-UBRFIRD2X6vPxd6fmaEfnPrN93zJTG.png",
        alt: "SlabHub Inventory Kanban view showing TCG slabs organized across Acquired, In Transit, Grading, In Stock, Listed, and Sold columns",
    },
    {
        id: "grid",
        label: "Public Shop Page",
        image:
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image_2026-02-12_11-48-34-xzPki48TdOwOmYjLIcQXnHxlfMCDj9.png",
        alt: "SlabHub public Items for Sale grid showing TCG cards with images, stock badges, market averages, and prices",
    },
    {
        id: "dashboard",
        label: "Analytics",
        image:
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image_2026-02-12_11-49-41-YhgUC3NiXVwCu4yIEBzcUAZv5yPkBz.png",
        alt: "SlabHub Overview Dashboard showing total items, market value, a portfolio value chart, inventory breakdown, and recent activity",
    },
];

/* ─── Main Component ─── */
export function SlabHubTourCarousel() {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => setCurrent(api.selectedScrollSnap()));
    }, [api]);

    function goTo(index: number) {
        api?.scrollTo(index);
    }

    return (
        <div className="mx-auto w-full max-w-[1400px]">
            {/* ── Hero frame: thick amber border + layered glow ── */}
            <div
                className={cn(
                    "group/frame relative rounded-[28px] p-[2px]",
                    "bg-gradient-to-b from-[#FBAC00] via-[#FBAC00]/80 to-[#FBAC00]/60",
                    "shadow-[0_0_60px_rgba(251,172,0,0.2),0_0_120px_rgba(251,172,0,0.08),0_20px_60px_rgba(0,0,0,0.4)]",
                    "transition-shadow duration-500",
                    "hover:shadow-[0_0_80px_rgba(251,172,0,0.3),0_0_160px_rgba(251,172,0,0.12),0_24px_80px_rgba(0,0,0,0.5)]",
                    "focus-within:ring-2 focus-within:ring-[#FBAC00]/60 focus-within:ring-offset-2 focus-within:ring-offset-background"
                )}
            >
                <div className="rounded-[26px] border border-white/[0.06] bg-card p-4 sm:p-5 lg:p-6">
                    <div className="overflow-hidden rounded-[20px] bg-[#0f1117]">
                        <Carousel
                            setApi={setApi}
                            opts={{ loop: true, align: "start", watchDrag: true }}
                            className="w-full"
                        >
                            <CarouselContent>
                                {slides.map((slide) => (
                                    <CarouselItem key={slide.id}>
                                        <div className="relative">
                                            <Image
                                                src={slide.image}
                                                alt={slide.alt}
                                                width={1400}
                                                height={900}
                                                className="h-auto max-h-[720px] w-full object-contain"
                                                priority={slide.id === "kanban"}
                                            />
                                            <div className="pointer-events-none absolute inset-0 bg-white/[0.03]" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </div>
                </div>
            </div>

            {/* ── Labeled tab switchers ── */}
            <div className="mt-6 flex items-center justify-center">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-card/80 p-1 backdrop-blur-sm">
                    {slides.map((slide, i) => (
                        <button
                            key={slide.id}
                            onClick={() => goTo(i)}
                            aria-selected={current === i}
                            role="tab"
                            className={cn(
                                "relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50",
                                current === i
                                    ? "bg-[#FBAC00] text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.3)]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {slide.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
