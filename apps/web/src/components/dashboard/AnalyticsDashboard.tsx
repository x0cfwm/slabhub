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
import { getAnalyticsStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, MessageSquare, MousePointerClick } from "lucide-react";

const chartConfig = {
  views: {
    label: "Total Views",
    color: "var(--chart-1)",
  },
  unique: {
    label: "Unique Visitors",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;


export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d">("7d");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const stats = await getAnalyticsStats(timeRange === "7d" ? 7 : 30);
        setData(stats);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeRange]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shop Analytics</h2>
          <p className="text-muted-foreground">Monitor your public shop performance.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalViews}</div>
            <p className="text-xs text-muted-foreground">Shop page loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">Distinct users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.inquiries}</div>
            <p className="text-xs text-muted-foreground">Purchase intent clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Views to inquiries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
          <CardDescription>Daily page views and unique visitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
            <AreaChart data={data.views} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} className="stroke-muted/50" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                minTickGap={32}
                tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={12} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="views"
                type="monotone"
                fill="var(--color-views)"
                fillOpacity={0.1}
                stroke="var(--color-views)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                dataKey="unique"
                type="monotone"
                fill="var(--color-unique)"
                fillOpacity={0.1}
                stroke="var(--color-unique)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Viewed Items</CardTitle>
            <CardDescription>Which items get the most clicks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {data.topItems.length > 0 ? (
                data.topItems.map((item: any) => {
                  const maxViews = Math.max(...data.topItems.map((i: any) => i.views));
                  const percentage = maxViews > 0 ? (item.views / maxViews) * 100 : 0;
                  
                  return (
                    <div key={item.name} className="flex items-center">
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate pr-4">
                            {item.name}
                          </span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {item.views}
                          </span>
                        </div>
                        <div className="w-full bg-accent rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm italic">
                  No data to display yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your visitors come from.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {data.sources.length > 0 ? (
                data.sources.map((source: any) => {
                  const maxVal = Math.max(...data.sources.map((s: any) => s.value));
                  const percentage = maxVal > 0 ? (source.value / maxVal) * 100 : 0;
                  
                  return (
                    <div key={source.name} className="flex items-center">
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate pr-4">
                            {source.name}
                          </span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {source.value}
                          </span>
                        </div>
                        <div className="w-full bg-accent rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm italic">
                  No traffic data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Where your visitors are located.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {data.topCountries.length > 0 ? (
                data.topCountries.map((country: any) => {
                  const maxVal = Math.max(...data.topCountries.map((c: any) => c.value));
                  const percentage = maxVal > 0 ? (country.value / maxVal) * 100 : 0;
                  
                  const getFlag = (code: string) => {
                    if (code === 'Unknown') return '🌐';
                    return code
                      .toUpperCase()
                      .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
                  };

                  return (
                    <div key={country.name} className="flex items-center">
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <span>{getFlag(country.name)}</span>
                            {country.name}
                          </span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {country.value}
                          </span>
                        </div>
                        <div className="w-full bg-accent rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm italic">
                  No location data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
