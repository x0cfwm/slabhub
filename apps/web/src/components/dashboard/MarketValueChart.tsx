"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { isWithinInterval, startOfDay, endOfDay, parseISO, addSeconds, subDays } from "date-fns";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

import { InventoryItem, PortfolioHistoryEntry } from "@/lib/types";

const calculateChartData = (history: PortfolioHistoryEntry[], items: InventoryItem[], days: number) => {
    if (!history || history.length === 0) return [];
    const slice = history.slice(-days - 1);

    // Pre-filter sold items for faster lookups
    const soldItems = items.filter(i => i.stage === "SOLD" && i.soldDate);

    // Backend history array always ends on exactly "today" at 23:59:59.999
    // `slice[i]` corresponds to `slice.length - 1 - i` days ago.
    return slice.map((entry, i) => {
        const prev = slice[i - 1];
        const delta = prev ? entry.soldCount - prev.soldCount : 0;

        let intervalItems: { name: string; pnl: number }[] = [];
        if (prev && delta > 0) {
            try {
                const daysAgoEnd = slice.length - 1 - i;
                const daysAgoStart = slice.length - 1 - (i - 1);

                // Use the exact same date math as the backend to avoid mismatches
                const start = addSeconds(endOfDay(subDays(new Date(), daysAgoStart)), 1);
                const end = endOfDay(subDays(new Date(), daysAgoEnd));
                
                intervalItems = soldItems
                    .filter(item => {
                        const sDate = new Date(item.soldDate!);
                        return isWithinInterval(sDate, { start, end });
                    })
                    .map(item => {
                        const acqPrice = item.acquisitionPrice || 0;
                        const soldPrice = item.soldPrice || 0;
                        const gradingCost = (item as any).gradingCost || 0;
                        // Use product name of sealed, or generic name, or title from PriceCharting.
                        const name = (item as any).refPriceChartingProduct?.title 
                            || item.productName 
                            || (item as any).cardProfile?.name 
                            || "Unknown Item";
                        return {
                            name,
                            pnl: soldPrice - acqPrice - gradingCost,
                        };
                    });
            } catch (err) {
                console.error("Date comparison failed:", err);
            }
        }

        return {
            ...entry,
            intervalSoldCount: delta > 0 ? delta : 0,
            intervalItems,
        };
    });
};

const chartConfig = {
    value: {
        label: "Market Value",
        color: "var(--chart-1)",
    },
    realizedPnl: {
        label: "Realized P&L",
        color: "#22c55e",
    },
    unrealizedPnl: {
        label: "Unrealized P&L",
        color: "#22c55e",
    },
} satisfies ChartConfig;

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toLocaleString()}`;
};

const formatPnl = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    if (Math.abs(value) >= 1000) {
        return `${sign}$${(value / 1000).toFixed(1)}k`;
    }
    return `${sign}$${value.toLocaleString()}`;
};

const formatPercent = (pnl: number, cost: number) => {
    if (!cost || cost === 0) return "";
    const pct = (pnl / cost) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
};

interface PnlSummaryCardProps {
    label: string;
    value: string;
    subtext: string;
    icon: React.ReactNode;
    positive?: boolean;
    neutral?: boolean;
}

function PnlSummaryCard({ label, value, subtext, icon, positive, neutral }: PnlSummaryCardProps) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border p-3 bg-card">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="text-muted-foreground">{icon}</span>
            </div>
            <span className={`text-lg font-bold tabular-nums ${
                neutral ? "text-foreground" : positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
            }`}>
                {value}
            </span>
            <span className="text-xs text-muted-foreground">{subtext}</span>
        </div>
    );
}

interface MarketValueChartProps {
    items: InventoryItem[];
    history: PortfolioHistoryEntry[];
}

export function MarketValueChart({ items, history }: MarketValueChartProps) {
    const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "3m">("3m");

    const data = React.useMemo(() => {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        return calculateChartData(history, items, days);
    }, [history, items, timeRange]);

    // Get the latest data point for summary cards
    const latest = data.length > 0 ? data[data.length - 1] : null;

    const hasSoldItems = latest && latest.soldCount > 0;

    return (
        <Card className="w-full">
            {/* PnL Summary Cards */}
            {latest && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-6 pt-4">
                    <PnlSummaryCard
                        label="Active Portfolio"
                        value={formatCurrency(latest.value)}
                        subtext={`${latest.count} items · Realized P&L ${formatPnl(latest.realizedPnl)}`}
                        icon={<BarChart3 className="h-3.5 w-3.5" />}
                        neutral
                    />
                    <PnlSummaryCard
                        label="Unrealized P&L"
                        value={formatPnl(latest.unrealizedPnl)}
                        subtext={formatPercent(latest.unrealizedPnl, latest.cost) || "No cost basis"}
                        icon={latest.unrealizedPnl >= 0
                            ? <TrendingUp className="h-3.5 w-3.5" />
                            : <TrendingDown className="h-3.5 w-3.5" />}
                        positive={latest.unrealizedPnl >= 0}
                    />
                    <PnlSummaryCard
                        label="Realized P&L"
                        value={hasSoldItems ? formatPnl(latest.realizedPnl) : "—"}
                        subtext={hasSoldItems
                            ? `${latest.soldCount} sold · Rev ${formatCurrency(latest.soldRevenue)}`
                            : "No sold items"}
                        icon={<DollarSign className="h-3.5 w-3.5" />}
                        positive={!hasSoldItems || latest.realizedPnl >= 0}
                        neutral={!hasSoldItems}
                    />
                    <PnlSummaryCard
                        label="Total P&L"
                        value={formatPnl(latest.totalPnl)}
                        subtext={formatPercent(latest.totalPnl, latest.cost + latest.soldCost) || "N/A"}
                        icon={latest.totalPnl >= 0
                            ? <TrendingUp className="h-3.5 w-3.5" />
                            : <TrendingDown className="h-3.5 w-3.5" />}
                        positive={latest.totalPnl >= 0}
                    />
                </div>
            )}

            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[350px] w-full"
                >
                    <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                        <defs>
                            <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-value)"
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-value)"
                                    stopOpacity={0.01}
                                />
                            </linearGradient>
                            <linearGradient id="fillRealizedPnl" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="#22c55e"
                                    stopOpacity={0.2}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#22c55e"
                                    stopOpacity={0.01}
                                />
                            </linearGradient>
                            <linearGradient id="fillUnrealizedPnl" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="#22c55e"
                                    stopOpacity={0.1}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#22c55e"
                                    stopOpacity={0.01}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} className="stroke-muted/50" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            minTickGap={32}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            yAxisId="left"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            className="text-muted-foreground"
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    className="w-[280px]"
                                    formatter={(value, name, item) => {
                                        const payload = item?.payload;
                                        if (name === "value") {
                                            return (
                                                <div className="flex justify-between items-center w-full gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-0.5 w-3 rounded-full bg-[var(--color-value)]" />
                                                        <span className="text-muted-foreground whitespace-nowrap">Market Value</span>
                                                    </div>
                                                    <span className="font-mono font-medium">{Number(value).toLocaleString()}</span>
                                                </div>
                                            );
                                        }
                                        if (name === "realizedPnl") {
                                            const pnlValue = Number(value);
                                            const pnlColor = pnlValue >= 0 ? "text-green-600" : "text-red-500";
                                            return (
                                                <div className="flex flex-col gap-0.5 w-full">
                                                    <div className="flex justify-between items-center w-full gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-0.5 w-3 rounded-full bg-[#22c55e]" />
                                                            <span className="text-muted-foreground whitespace-nowrap">Realized P&L</span>
                                                        </div>
                                                        <span className={`font-mono font-medium ${pnlColor}`}>{formatPnl(pnlValue)}</span>
                                                    </div>
                                                    {payload?.intervalSoldCount > 0 && (
                                                        <div className="flex flex-col gap-1 w-full pl-2 mt-1 border-l ml-1.5 border-green-200 dark:border-green-900 overflow-hidden">
                                                            <div className="flex flex-col gap-1">
                                                                {payload.intervalItems && payload.intervalItems.length > 0 ? (
                                                                    <>
                                                                        {(payload.intervalItems as any[])?.slice(0, 10).map((item, i) => (
                                                                            <div key={i} className="flex justify-between items-center gap-2 w-full">
                                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                                                                    • {item.name}
                                                                                </span>
                                                                                <span className={`text-[9px] font-mono font-medium ${item.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"} shrink-0`}>
                                                                                    {formatPnl(item.pnl)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {(payload.intervalItems as any[])?.length > 10 && (
                                                                            <span className="text-[9px] text-muted-foreground italic pl-2">
                                                                                + {(payload.intervalItems as any[]).length - 10} more sold
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                                                                        Sold {payload.intervalSoldCount} item{payload.intervalSoldCount > 1 ? "s" : ""}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (name === "unrealizedPnl") {
                                            const pnlValue = Number(value);
                                            const pnlColor = pnlValue >= 0 ? "text-green-600" : "text-red-500";
                                            return (
                                                <div className="flex justify-between items-center w-full gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-0 w-3 border-t-2 border-dashed border-[#22c55e]" />
                                                        <span className="text-muted-foreground whitespace-nowrap">Unrealized P&L</span>
                                                    </div>
                                                    <span className={`font-mono font-medium ${pnlColor}`}>{formatPnl(pnlValue)}</span>
                                                </div>
                                            );
                                        }
                                        return <span className="font-mono font-medium">{Number(value).toLocaleString()}</span>;
                                    }}
                                />
                            }
                        />
                        <Area
                            yAxisId="left"
                            dataKey="value"
                            type="monotone"
                            fill="url(#fillValue)"
                            stroke="var(--color-value)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Area
                            yAxisId="left"
                            dataKey="unrealizedPnl"
                            type="monotone"
                            fill="url(#fillUnrealizedPnl)"
                            stroke="#22c55e"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                            yAxisId="left"
                            dataKey="realizedPnl"
                            type="monotone"
                            fill="url(#fillRealizedPnl)"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={(props: any) => {
                                const { cx, cy, payload, index } = props;
                                if (payload.intervalSoldCount > 0) {
                                  return (
                                    <circle
                                      key={`dot-${index}`}
                                      cx={cx}
                                      cy={cy}
                                      r={6}
                                      fill="#22c55e"
                                      stroke="white"
                                      strokeWidth={2}
                                      className="drop-shadow-sm"
                                    />
                                  );
                                }
                                return null as any;
                            }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
