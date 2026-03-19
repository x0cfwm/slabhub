"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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

const calculateChartData = (history: PortfolioHistoryEntry[], days: number) => {
    if (!history || history.length === 0) return [];
    const slice = history.slice(-days - 1);
    return slice;
};

const chartConfig = {
    value: {
        label: "Market Value",
        color: "var(--chart-1)",
    },
    cost: {
        label: "Acquisition Cost",
        color: "var(--chart-2)",
    },
    count: {
        label: "Item Count",
        color: "var(--chart-1)",
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
        switch (timeRange) {
            case "7d":
                return calculateChartData(history, 7);
            case "30d":
                return calculateChartData(history, 30);
            case "3m":
                return calculateChartData(history, 90);
        }
    }, [history, timeRange]);

    // Get the latest data point for summary cards
    const latest = data.length > 0 ? data[data.length - 1] : null;

    const hasSoldItems = latest && latest.soldCount > 0;

    return (
        <Card className="w-full">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Portfolio Performance</CardTitle>
                    <CardDescription>
                        Historical portfolio value & profit tracking
                    </CardDescription>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    <Button
                        variant={timeRange === "3m" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => setTimeRange("3m")}
                    >
                        Last 3 months
                    </Button>
                    <Button
                        variant={timeRange === "30d" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => setTimeRange("30d")}
                    >
                        Last 30 days
                    </Button>
                    <Button
                        variant={timeRange === "7d" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => setTimeRange("7d")}
                    >
                        Last 7 days
                    </Button>
                </div>
            </CardHeader>

            {/* PnL Summary Cards */}
            {latest && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-6 pt-4">
                    <PnlSummaryCard
                        label="Active Portfolio"
                        value={formatCurrency(latest.value)}
                        subtext={`${latest.count} items · Cost ${formatCurrency(latest.cost)}`}
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
                            <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-cost)"
                                    stopOpacity={0.2}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-cost)"
                                    stopOpacity={0.01}
                                />
                            </linearGradient>
                            <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-count)"
                                    stopOpacity={0.1}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-count)"
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
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            className="text-muted-foreground"
                            tickFormatter={(value) => `${value}`}
                        />
                        <ChartTooltip
                            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    className="w-[220px]"
                                    formatter={(value, name, item) => {
                                        const payload = item?.payload;
                                        if (name === "value") {
                                            const pnlValue = payload?.unrealizedPnl ?? 0;
                                            const pnlColor = pnlValue >= 0 ? "text-green-600" : "text-red-500";
                                            return (
                                                <div className="flex flex-col gap-0.5 w-full">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Market Value</span>
                                                        <span className="font-mono font-medium">{Number(value).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className={`text-xs ${pnlColor}`}>Unrealized P&L</span>
                                                        <span className={`text-xs font-mono ${pnlColor}`}>{formatPnl(pnlValue)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (name === "cost") {
                                            return (
                                                <div className="flex justify-between w-full">
                                                    <span className="text-muted-foreground">Cost Basis</span>
                                                    <span className="font-mono font-medium">{Number(value).toLocaleString()}</span>
                                                </div>
                                            );
                                        }
                                        if (name === "count") {
                                            const soldCount = payload?.soldCount ?? 0;
                                            return (
                                                <div className="flex flex-col gap-0.5 w-full">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Item Count</span>
                                                        <span className="font-mono font-medium">{Number(value)}</span>
                                                    </div>
                                                    {soldCount > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-muted-foreground">Sold</span>
                                                            <span className="text-xs font-mono">{soldCount}</span>
                                                        </div>
                                                    )}
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
                            dataKey="cost"
                            type="monotone"
                            fill="url(#fillCost)"
                            stroke="var(--color-cost)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
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
                            yAxisId="right"
                            dataKey="count"
                            type="monotone"
                            fill="url(#fillCount)"
                            stroke="var(--color-count)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
