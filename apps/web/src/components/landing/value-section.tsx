import {
    TrendingUp,
    Layers,
    Share2,
    Sparkles,
    Receipt,
    RefreshCw,
} from "lucide-react";

const values = [
    {
        icon: TrendingUp,
        title: "Look up market price",
        description: "No more 130point.",
    },
    {
        icon: Layers,
        title: "Manage your inventory",
        description: "No more spreadsheets or uncertainty.",
    },
    {
        icon: Share2,
        title: "One inventory, everywhere",
        description:
            "Update once, share the same link to Facebook, Discord, and beyond.",
    },
    {
        icon: Sparkles,
        title: "Your data, your insights",
        description: "Spot trends, not just transactions.",
    },
    {
        icon: Receipt,
        title: "Know what's actually selling",
        description: "Track P&L by card, channel, and customer.",
    },
    {
        icon: RefreshCw,
        title: "Always up-to-date for buyers",
        description:
            "Your buyers always have access to up-to-date inventory.",
    },
];

export function ValueSection() {
    return (
        <section className="relative overflow-hidden px-4 py-20 lg:px-8 lg:py-28">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary)/3%,_transparent_60%)]" />
            <div className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.02] blur-[100px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/[0.02] blur-[100px]" />

            <div className="relative mx-auto max-w-6xl">
                {/* Header */}
                <div className="mx-auto mb-14 max-w-2xl text-center">
                    <div className="mb-5 inline-flex items-center rounded-full border border-border/60 bg-card/60 px-3.5 py-1 backdrop-blur-sm">
                        <span className="text-xs font-semibold tracking-wide text-primary">
                            Value
                        </span>
                    </div>
                    <h2 className="font-display text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                        One inventory.{" "}
                        <span className="text-primary">Everywhere you sell.</span>
                    </h2>
                    <p className="mt-4 text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg">
                        Look up market prices, manage stock, and share one always-updated
                        link across Facebook, Discord, and beyond.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {values.map((item, i) => (
                        <div
                            key={i}
                            className="group rounded-[20px] border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.04]"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <item.icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-display text-base font-bold text-foreground">
                                {item.title}
                            </h3>
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
