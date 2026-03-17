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

import { InventoryItem, PortfolioHistoryEntry } from "@/lib/types";

const calculateChartData = (history: PortfolioHistoryEntry[], days: number) => {
    if (!history || history.length === 0) return [];

    // Backend returns history from days ago to today.
    // history[0] is 90 days ago, history[last] is today.

    const slice = history.slice(-days - 1);

    // If we want to reduce points for 3m to make it cleaner (optional)
    if (days > 30) {
        // Return every 2nd or 3rd point if needed, but daily is usually fine for Area chart
        return slice;
    }

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

    return (
        <Card className="w-full">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Est. Market Value</CardTitle>
                    <CardDescription>
                        Historical portfolio performance over the selected period
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
                                    className="w-[180px]"
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
