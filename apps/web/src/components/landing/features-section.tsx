"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Kanban,
    Globe,
    TrendingUp,
    BarChart3,
    UserCircle,
    GripVertical,
    Copy,
    ExternalLink,
    DollarSign,
    MapPin,
    CreditCard,
    Truck,
    Star,
    Package,
} from "lucide-react";

/* ──── Feature data ──── */
const FEATURES = [
    {
        id: "crm",
        icon: Kanban,
        title: "CRM",
        description: "Add items, track across stages, list.",
    },
    {
        id: "shop",
        icon: Globe,
        title: "Public shop page",
        description: "Share your up to date inventory anywhere.",
    },
    {
        id: "price",
        icon: TrendingUp,
        title: "Market Price",
        description: "Last sold for eBay and TCGplayer data.",
    },
    {
        id: "analytics",
        icon: BarChart3,
        title: "Analytics",
        description: "P&L dashboard by sales channels and product types.",
    },
    {
        id: "profile",
        icon: UserCircle,
        title: "Profile",
        description:
            "Your references, location, preferred payment and fulfillment ways.",
    },
];

const DURATION = 6000;

/* ──── Mini visual panels ──── */

function CRMVisual() {
    const stages = [
        { name: "Acquired", count: 1, color: "bg-primary/20 text-primary" },
        { name: "In Transit", count: 2, color: "bg-blue-500/20 text-blue-400" },
        { name: "Grading", count: 3, color: "bg-warning/20 text-warning" },
        { name: "In Stock", count: 2, color: "bg-emerald-500/20 text-emerald-400" },
        { name: "Listed", count: 6, color: "bg-primary/20 text-primary" },
        { name: "Sold", count: 2, color: "bg-success/20 text-success" },
    ];

    const cards = [
        { name: "Charizard VMAX", grade: "PSA 10", price: "$320" },
        { name: "Luffy Gear 5", grade: "PSA 10", price: "$450" },
        { name: "Nami SP Art", grade: "BGS 10", price: "$280" },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Stage chips */}
            <div className="flex flex-wrap gap-1.5">
                {stages.map((s) => (
                    <div
                        key={s.name}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.color}`}
                    >
                        {s.name}
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">
                            {s.count}
                        </span>
                    </div>
                ))}
            </div>
            {/* Card list */}
            <div className="flex flex-col gap-2">
                {cards.map((c, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5"
                    >
                        <div className="flex items-center gap-2.5">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div className="h-8 w-6 rounded bg-muted-foreground/10" />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                    {c.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {c.grade}
                                </span>
                            </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">
                            {c.price}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ShopVisual() {
    const items = [
        { name: "2nd Anniversary Set", price: "$600" },
        { name: "Bartholomew Kuma", price: "$60" },
        { name: "Monkey.D.Luffy Serial", price: "$3,000" },
        { name: "Buggy SP Gold", price: "$1,200" },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Live inventory
                    </div>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                    <Copy className="h-3 w-3" />
                    Copy link
                </button>
            </div>
            {/* Grid */}
            <div className="grid grid-cols-2 gap-2">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-2.5"
                    >
                        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted-foreground/5">
                            <Package className="h-6 w-6 text-muted-foreground/20" />
                        </div>
                        <div>
                            <p className="truncate text-[11px] font-semibold text-foreground">
                                {item.name}
                            </p>
                            <p className="font-mono text-xs font-bold text-primary">
                                {item.price}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                slabhub.com/shop/yourname
            </div>
        </div>
    );
}

function PriceVisual() {
    const points = [40, 35, 50, 45, 55, 62, 58, 70, 65, 75, 72, 80];

    return (
        <div className="flex flex-col gap-3">
            {/* Source chips */}
            <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-semibold text-blue-400">
                    eBay
                </span>
                <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-semibold text-orange-400">
                    TCGplayer
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                    Last sold
                </span>
            </div>
            {/* Chart area */}
            <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="mb-2 flex items-baseline gap-2">
                    <span className="font-mono text-xl font-bold text-foreground">
                        $325.00
                    </span>
                    <span className="font-mono text-xs font-semibold text-success">
                        +12.4%
                    </span>
                </div>
                {/* Simplified line chart */}
                <svg
                    viewBox="0 0 240 80"
                    className="w-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Grid lines */}
                    {[0, 20, 40, 60].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="240"
                            y2={y}
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth="0.5"
                        />
                    ))}
                    {/* Area fill */}
                    <path
                        d={`M0 ${80 - points[0]} ${points
                            .map(
                                (p, i) =>
                                    `L${(i * 240) / (points.length - 1)} ${80 - p}`
                            )
                            .join(" ")} L240 80 L0 80 Z`}
                        fill="url(#areaGrad)"
                        opacity="0.3"
                    />
                    {/* Line */}
                    <path
                        d={`M0 ${80 - points[0]} ${points
                            .map(
                                (p, i) =>
                                    `L${(i * 240) / (points.length - 1)} ${80 - p}`
                            )
                            .join(" ")}`}
                        stroke="var(--primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Highlighted last point */}
                    <circle
                        cx="240"
                        cy={80 - points[points.length - 1]}
                        r="4"
                        fill="var(--primary)"
                    />
                    <circle
                        cx="240"
                        cy={80 - points[points.length - 1]}
                        r="8"
                        fill="var(--primary)"
                        opacity="0.2"
                    />
                    <defs>
                        <linearGradient
                            id="areaGrad"
                            x1="120"
                            y1="0"
                            x2="120"
                            y2="80"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stopColor="var(--primary)" />
                            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Jan 2026</span>
                <span>Feb 2026</span>
            </div>
        </div>
    );
}

function AnalyticsVisual() {
    const channels = [
        { name: "eBay", pct: 45, color: "bg-blue-400" },
        { name: "TCGplayer", pct: 30, color: "bg-orange-400" },
        { name: "Local", pct: 15, color: "bg-emerald-400" },
        { name: "Discord", pct: 10, color: "bg-indigo-400" },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Stat row */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Revenue", value: "$24,580", sub: "+18%" },
                    { label: "Cards Sold", value: "142", sub: "+12%" },
                    { label: "Avg. Price", value: "$173", sub: "+5%" },
                ].map((s, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border bg-background/40 px-2.5 py-2"
                    >
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                        <p className="font-mono text-sm font-bold text-foreground">
                            {s.value}
                        </p>
                        <p className="font-mono text-[9px] font-semibold text-success">
                            {s.sub}
                        </p>
                    </div>
                ))}
            </div>
            {/* Channel breakdown */}
            <div className="rounded-xl border border-border bg-background/40 p-3">
                <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
                    Sales by Channel
                </p>
                <div className="flex flex-col gap-2">
                    {channels.map((ch) => (
                        <div key={ch.name} className="flex items-center gap-2.5">
                            <span className="w-16 text-[10px] text-muted-foreground">
                                {ch.name}
                            </span>
                            <div className="flex-1 overflow-hidden rounded-full bg-muted-foreground/10 h-1.5">
                                <div
                                    className={`h-full rounded-full ${ch.color}`}
                                    style={{ width: `${ch.pct}%` }}
                                />
                            </div>
                            <span className="w-8 text-right font-mono text-[10px] text-foreground">
                                {ch.pct}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {/* P&L */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-foreground">
                        Net P&L
                    </span>
                </div>
                <span className="font-mono text-sm font-bold text-success">
                    +$8,240
                </span>
            </div>
        </div>
    );
}

function ProfileVisual() {
    const chips = [
        { icon: MapPin, label: "New York, NY" },
        { icon: CreditCard, label: "PayPal" },
        { icon: CreditCard, label: "Venmo" },
        { icon: Truck, label: "Ships 24h" },
        { icon: Truck, label: "Local pickup" },
        { icon: Star, label: "127 reviews" },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Profile header */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    KZ
                </div>
                <div>
                    <p className="text-sm font-bold text-foreground">Kuz</p>
                    <p className="text-[10px] text-muted-foreground">
                        @kuz - Member since 2024
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="font-mono text-xs font-bold text-foreground">
                        4.9
                    </span>
                </div>
            </div>
            {/* Chips */}
            <div className="flex flex-wrap gap-1.5">
                {chips.map((ch, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                        <ch.icon className="h-3 w-3 text-primary/70" />
                        {ch.label}
                    </div>
                ))}
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Items listed", value: "10" },
                    { label: "Completed sales", value: "84" },
                    { label: "Response time", value: "<1h" },
                ].map((s, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center rounded-xl border border-border bg-background/40 py-2.5"
                    >
                        <span className="font-mono text-sm font-bold text-foreground">
                            {s.value}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const VISUALS = [CRMVisual, ShopVisual, PriceVisual, AnalyticsVisual, ProfileVisual];

/* ──── Main component ──── */
export function FeaturesSection() {
    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const startRef = useRef<number | null>(null);
    const rafRef = useRef<number>(0);

    const goTo = useCallback((index: number) => {
        setActive(index);
        setProgress(0);
        startRef.current = null;
    }, []);

    /* Auto-advance timer */
    useEffect(() => {
        if (paused) {
            startRef.current = null;
            cancelAnimationFrame(rafRef.current);
            return;
        }

        const tick = (now: number) => {
            if (!startRef.current) startRef.current = now;
            const elapsed = now - startRef.current;
            const pct = Math.min(elapsed / DURATION, 1);
            setProgress(pct);

            if (pct >= 1) {
                setActive((prev) => (prev + 1) % FEATURES.length);
                setProgress(0);
                startRef.current = null;
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [active, paused]);

    const ActiveVisual = VISUALS[active];

    return (
        <section className="px-4 py-16 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mx-auto mb-12 max-w-2xl text-center">
                    <div className="mb-4 flex justify-center">
                        <span className="rounded-full border border-border bg-card/60 px-3.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                            Features
                        </span>
                    </div>
                    <h2 className="font-display text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Clarity for TCG vendors and collectors.
                    </h2>
                    <p className="mt-3 text-pretty text-muted-foreground leading-relaxed">
                        CRM stages, a public shop link, real market comps, and channel
                        {"P&L"} — all in one place.
                    </p>
                </div>

                {/* Amber-framed container */}
                <div
                    className="relative mx-auto max-w-5xl rounded-[28px]"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                >
                    <div className="rounded-[28px] border border-border bg-card/50 p-6 sm:p-8">
                        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
                            {/* Left: feature picker */}
                            <div
                                className="flex flex-col gap-1"
                                role="tablist"
                                aria-label="Feature tabs"
                            >
                                {FEATURES.map((feat, i) => {
                                    const isActive = active === i;
                                    const Icon = feat.icon;

                                    return (
                                        <button
                                            key={feat.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`panel-${feat.id}`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => goTo(i)}
                                            onKeyDown={(e) => {
                                                if (e.key === "ArrowDown") {
                                                    e.preventDefault();
                                                    goTo((i + 1) % FEATURES.length);
                                                } else if (e.key === "ArrowUp") {
                                                    e.preventDefault();
                                                    goTo((i - 1 + FEATURES.length) % FEATURES.length);
                                                }
                                            }}
                                            className={`group relative flex flex-col gap-1 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${isActive
                                                    ? "bg-card shadow-[0_0_16px_rgba(251,172,0,0.06)]"
                                                    : "hover:bg-card/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon
                                                    className={`h-4 w-4 shrink-0 transition-colors ${isActive
                                                            ? "text-primary"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                        }`}
                                                />
                                                <span
                                                    className={`text-sm font-semibold transition-colors ${isActive
                                                            ? "text-foreground"
                                                            : "text-muted-foreground group-hover:text-foreground"
                                                        }`}
                                                >
                                                    {feat.title}
                                                </span>
                                            </div>
                                            <p
                                                className={`pl-[26px] text-xs leading-relaxed transition-colors ${isActive
                                                        ? "text-muted-foreground"
                                                        : "text-muted-foreground/60"
                                                    }`}
                                            >
                                                {feat.description}
                                            </p>
                                            {/* Progress bar */}
                                            {isActive && (
                                                <div className="mt-1.5 ml-[26px] h-[2px] w-[calc(100%-26px)] overflow-hidden rounded-full bg-muted-foreground/10">
                                                    <div
                                                        className="h-full rounded-full bg-primary transition-none"
                                                        style={{
                                                            width: `${progress * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right: visual panel */}
                            <div
                                id={`panel-${FEATURES[active].id}`}
                                role="tabpanel"
                                aria-labelledby={FEATURES[active].id}
                                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                            >
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <ActiveVisual />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </section>
    );
}
