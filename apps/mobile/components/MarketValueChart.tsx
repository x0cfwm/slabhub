import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, GestureResponderEvent } from 'react-native';
import Svg, {
    Path,
    Defs,
    LinearGradient,
    Stop,
    G,
    Line,
    Circle,
    Rect,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioHistoryEntry } from '@/lib/types';
import Colors from '@/constants/colors';

const c = Colors.dark;

const COLOR_VALUE = c.accent;
const COLOR_PNL = '#22c55e';
const COLOR_PNL_NEG = '#ef4444';

type TimeRange = '7d' | '30d' | '3m';

interface ChartDatum extends PortfolioHistoryEntry {
    intervalSoldCount: number;
    intervalItems: { name: string; pnl: number }[];
}

interface MarketValueChartProps {
    items: any[];
    history: PortfolioHistoryEntry[];
}

const isSoldStage = (stage: string | undefined) =>
    stage === 'SOLD' || stage === 'sold';

const calculateChartData = (
    history: PortfolioHistoryEntry[],
    items: any[],
    days: number,
): ChartDatum[] => {
    if (!history || history.length === 0) return [];
    const slice = history.slice(-days - 1);

    const soldItems = items
        .filter((i: any) => isSoldStage(i.stage) && i.soldDate)
        .sort((a: any, b: any) => {
            const aAcq = a.acquisitionDate
                ? new Date(a.acquisitionDate).getTime()
                : new Date(a.createdAt).getTime();
            const aSold = new Date(a.soldDate).getTime();
            const aEffective = Math.max(aAcq, aSold);

            const bAcq = b.acquisitionDate
                ? new Date(b.acquisitionDate).getTime()
                : new Date(b.createdAt).getTime();
            const bSold = new Date(b.soldDate).getTime();
            const bEffective = Math.max(bAcq, bSold);

            return aEffective - bEffective;
        });

    let pointer = 0;
    let consumedCount = 0;
    const initialExpectedSoldCount = slice.length > 0 ? slice[0].soldCount ?? 0 : 0;

    while (pointer < soldItems.length && consumedCount < initialExpectedSoldCount) {
        consumedCount += (soldItems[pointer] as any).quantity || 1;
        pointer++;
    }

    return slice.map((entry, i) => {
        const prev = slice[i - 1];
        const delta = prev ? (entry.soldCount ?? 0) - (prev.soldCount ?? 0) : 0;

        const intervalItems: { name: string; pnl: number }[] = [];
        if (delta > 0) {
            let itemsToTake = delta;
            while (pointer < soldItems.length && itemsToTake > 0) {
                const item: any = soldItems[pointer];
                const qty = item.quantity || 1;
                const acqPrice = item.acquisitionPrice || 0;
                const soldPrice = item.soldPrice || 0;
                const gradingCost = item.gradingCost || 0;
                const name =
                    item.refPriceChartingProduct?.title ||
                    item.productName ||
                    item.cardProfile?.name ||
                    'Unknown Item';

                intervalItems.push({
                    name: qty > 1 ? `${qty}x ${name}` : name,
                    pnl: soldPrice * qty - acqPrice * qty - gradingCost,
                });

                itemsToTake -= qty;
                pointer++;
            }
        }

        return {
            ...entry,
            intervalSoldCount: delta > 0 ? delta : 0,
            intervalItems,
        };
    });
};

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value).toLocaleString()}`;
};

const formatPnl = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    if (Math.abs(value) >= 1000) return `${sign}$${(value / 1000).toFixed(1)}k`;
    return `${sign}$${Math.round(value).toLocaleString()}`;
};

const formatPercent = (pnl: number, cost: number) => {
    if (!cost || cost === 0) return '';
    const pct = (pnl / cost) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
};

interface InlinePnlProps {
    label: string;
    value: string;
    sub?: string;
    positive: boolean;
    neutral?: boolean;
    dashed?: boolean;
}

function InlinePnl({ label, value, sub, positive, neutral, dashed }: InlinePnlProps) {
    const valueColor = neutral ? c.textSecondary : positive ? COLOR_PNL : COLOR_PNL_NEG;
    return (
        <View style={styles.inlinePnl}>
            <View
                style={[
                    styles.inlineSwatch,
                    dashed
                        ? {
                              backgroundColor: 'transparent',
                              borderWidth: 1,
                              borderColor: COLOR_PNL,
                              borderStyle: 'dashed',
                          }
                        : { backgroundColor: COLOR_PNL },
                ]}
            />
            <Text style={styles.inlineLabel}>{label}</Text>
            <Text style={[styles.inlineValue, { color: valueColor }]}>{value}</Text>
            {sub ? <Text style={styles.inlineSub}>{sub}</Text> : null}
        </View>
    );
}

interface RangePillProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

function RangePill({ label, active, onPress }: RangePillProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.rangePill,
                active && styles.rangePillActive,
                { opacity: pressed ? 0.7 : 1 },
            ]}
        >
            <Text style={[styles.rangePillText, active && styles.rangePillTextActive]}>
                {label}
            </Text>
        </Pressable>
    );
}

function buildLinePath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
}

function buildAreaPath(
    points: { x: number; y: number }[],
    baselineY: number,
): string {
    if (points.length === 0) return '';
    const line = buildLinePath(points);
    const last = points[points.length - 1];
    const first = points[0];
    return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export function MarketValueChart({ items, history }: MarketValueChartProps) {
    const [timeRange, setTimeRange] = React.useState<TimeRange>('3m');
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

    const data = React.useMemo(() => {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        return calculateChartData(history, items, days);
    }, [history, items, timeRange]);

    const latest = data.length > 0 ? data[data.length - 1] : null;
    const hasSoldItems = !!(latest && (latest.soldCount ?? 0) > 0);

    if (!history || history.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Portfolio</Text>
                <View style={styles.emptyState}>
                    <Text style={styles.noData}>No history data available</Text>
                </View>
            </View>
        );
    }

    const fallbackWidth = Dimensions.get('window').width - 72;
    const innerWidth = (containerWidth > 0 ? containerWidth : fallbackWidth) - 24;
    const chartWidth = Math.max(innerWidth, 100);
    const chartHeight = 200;
    const paddingY = 12;
    const innerHeight = chartHeight - paddingY * 2;

    const values = data.map((d) => d.value || 0);
    const realizedPnls = data.map((d) => d.realizedPnl ?? 0);
    const unrealizedPnls = data.map((d) => d.unrealizedPnl ?? 0);

    const allPoints = [...values, ...realizedPnls, ...unrealizedPnls, 0];
    const minY = Math.min(...allPoints);
    const maxY = Math.max(...allPoints);
    const range = maxY - minY || 1;

    const xFor = (i: number) =>
        data.length <= 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth;
    const yFor = (v: number) =>
        paddingY + innerHeight - ((v - minY) / range) * innerHeight;

    const zeroY = yFor(0);
    const baselineY = paddingY + innerHeight;

    const valuePts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value || 0) }));
    const realizedPts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.realizedPnl ?? 0) }));
    const unrealizedPts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.unrealizedPnl ?? 0) }));

    const formatXAxisDate = (raw: string) => {
        if (!raw) return '';
        const d = new Date(raw);
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleTouch = (evt: GestureResponderEvent) => {
        if (data.length === 0) return;
        const { locationX } = evt.nativeEvent;
        const clamped = Math.max(0, Math.min(chartWidth, locationX));
        const idx = Math.round((clamped / chartWidth) * (data.length - 1));
        setHoverIndex(idx);
    };

    const activeIdx = hoverIndex ?? data.length - 1;
    const activePoint = data[activeIdx];

    return (
        <View
            style={styles.container}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {/* Hero */}
            {latest && (
                <View style={styles.hero}>
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroLeft}>
                            <Text style={styles.heroLabel}>Market Value</Text>
                            <Text style={styles.heroValue} numberOfLines={1}>
                                ${(latest.value || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                })}
                            </Text>
                            <Text style={styles.heroSub}>{latest.count ?? 0} items</Text>
                        </View>
                        <View
                            style={[
                                styles.deltaChip,
                                {
                                    backgroundColor:
                                        (latest.totalPnl ?? 0) >= 0
                                            ? 'rgba(34, 197, 94, 0.12)'
                                            : 'rgba(239, 68, 68, 0.12)',
                                },
                            ]}
                        >
                            <Ionicons
                                name={
                                    (latest.totalPnl ?? 0) >= 0
                                        ? 'trending-up'
                                        : 'trending-down'
                                }
                                size={14}
                                color={
                                    (latest.totalPnl ?? 0) >= 0 ? COLOR_PNL : COLOR_PNL_NEG
                                }
                            />
                            <Text
                                style={[
                                    styles.deltaChipText,
                                    {
                                        color:
                                            (latest.totalPnl ?? 0) >= 0
                                                ? COLOR_PNL
                                                : COLOR_PNL_NEG,
                                    },
                                ]}
                            >
                                {formatPercent(
                                    latest.totalPnl ?? 0,
                                    (latest.cost || 0) + (latest.soldCost ?? 0),
                                ) || formatPnl(latest.totalPnl ?? 0)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.inlineBreakdown}>
                        <InlinePnl
                            label="Unrealized"
                            value={formatPnl(latest.unrealizedPnl ?? 0)}
                            positive={(latest.unrealizedPnl ?? 0) >= 0}
                            dashed
                        />
                        <Text style={styles.inlineSep}>·</Text>
                        <InlinePnl
                            label="Realized"
                            value={hasSoldItems ? formatPnl(latest.realizedPnl ?? 0) : '—'}
                            sub={hasSoldItems ? `(${latest.soldCount} sold)` : undefined}
                            positive={(latest.realizedPnl ?? 0) >= 0}
                            neutral={!hasSoldItems}
                        />
                    </View>
                </View>
            )}

            {/* Range selector */}
            <View style={styles.rangeRow}>
                <View style={styles.rangePills}>
                    <RangePill label="7D" active={timeRange === '7d'} onPress={() => setTimeRange('7d')} />
                    <RangePill label="30D" active={timeRange === '30d'} onPress={() => setTimeRange('30d')} />
                    <RangePill label="3M" active={timeRange === '3m'} onPress={() => setTimeRange('3m')} />
                </View>
            </View>

            {/* Chart */}
            <View
                style={{ width: chartWidth, height: chartHeight }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleTouch}
                onResponderMove={handleTouch}
                onResponderRelease={() => setHoverIndex(null)}
                onResponderTerminate={() => setHoverIndex(null)}
            >
                <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                        <LinearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLOR_VALUE} stopOpacity="0.3" />
                            <Stop offset="1" stopColor={COLOR_VALUE} stopOpacity="0.01" />
                        </LinearGradient>
                        <LinearGradient id="fillRealized" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLOR_PNL} stopOpacity="0.2" />
                            <Stop offset="1" stopColor={COLOR_PNL} stopOpacity="0.01" />
                        </LinearGradient>
                    </Defs>

                    {/* Grid lines */}
                    <Line
                        x1={0}
                        y1={paddingY}
                        x2={chartWidth}
                        y2={paddingY}
                        stroke={c.border}
                        strokeWidth={1}
                        strokeOpacity={0.3}
                    />
                    <Line
                        x1={0}
                        y1={paddingY + innerHeight / 2}
                        x2={chartWidth}
                        y2={paddingY + innerHeight / 2}
                        stroke={c.border}
                        strokeWidth={1}
                        strokeOpacity={0.3}
                        strokeDasharray="4 4"
                    />
                    <Line
                        x1={0}
                        y1={baselineY}
                        x2={chartWidth}
                        y2={baselineY}
                        stroke={c.border}
                        strokeWidth={1}
                        strokeOpacity={0.4}
                    />

                    {/* Zero line for P&L if visible in range */}
                    {minY < 0 && maxY > 0 && (
                        <Line
                            x1={0}
                            y1={zeroY}
                            x2={chartWidth}
                            y2={zeroY}
                            stroke={c.textTertiary}
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            strokeDasharray="2 4"
                        />
                    )}

                    {/* Market value area + line */}
                    <Path d={buildAreaPath(valuePts, baselineY)} fill="url(#fillValue)" />
                    <Path
                        d={buildLinePath(valuePts)}
                        fill="none"
                        stroke={COLOR_VALUE}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Unrealized P&L line (dashed) */}
                    <Path
                        d={buildLinePath(unrealizedPts)}
                        fill="none"
                        stroke={COLOR_PNL}
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        strokeOpacity={0.9}
                    />

                    {/* Realized P&L area + line */}
                    <Path
                        d={buildAreaPath(realizedPts, zeroY < baselineY ? zeroY : baselineY)}
                        fill="url(#fillRealized)"
                    />
                    <Path
                        d={buildLinePath(realizedPts)}
                        fill="none"
                        stroke={COLOR_PNL}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Sold-day markers on realized series */}
                    {data.map((d, i) =>
                        d.intervalSoldCount > 0 ? (
                            <Circle
                                key={`sold-${i}`}
                                cx={xFor(i)}
                                cy={yFor(d.realizedPnl ?? 0)}
                                r={4.5}
                                fill={COLOR_PNL}
                                stroke={c.surface}
                                strokeWidth={1.5}
                            />
                        ) : null,
                    )}

                    {/* Hover cursor + active dot */}
                    {hoverIndex !== null && activePoint && (
                        <G>
                            <Line
                                x1={xFor(activeIdx)}
                                y1={paddingY}
                                x2={xFor(activeIdx)}
                                y2={baselineY}
                                stroke={c.textSecondary}
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                strokeOpacity={0.6}
                            />
                            <Circle
                                cx={xFor(activeIdx)}
                                cy={yFor(activePoint.value || 0)}
                                r={5}
                                fill={COLOR_VALUE}
                                stroke={c.surface}
                                strokeWidth={2}
                            />
                        </G>
                    )}
                </Svg>
            </View>

            {/* Axis labels */}
            <View style={[styles.axisRow, { width: chartWidth }]}>
                <Text style={styles.axisText}>{formatXAxisDate(data[0]?.date)}</Text>
                <Text style={styles.axisText}>
                    {formatXAxisDate(data[Math.floor(data.length / 2)]?.date)}
                </Text>
                <Text style={styles.axisText}>
                    {formatXAxisDate(data[data.length - 1]?.date)}
                </Text>
            </View>

            {/* Tooltip */}
            {hoverIndex !== null && activePoint && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipDate}>{formatXAxisDate(activePoint.date)}</Text>
                    <View style={styles.tooltipRow}>
                        <View style={styles.tooltipLabelWrap}>
                            <View style={[styles.tooltipSwatch, { backgroundColor: COLOR_VALUE }]} />
                            <Text style={styles.tooltipLabel}>Market Value</Text>
                        </View>
                        <Text style={styles.tooltipValue}>
                            {formatCurrency(activePoint.value || 0)}
                        </Text>
                    </View>
                    <View style={styles.tooltipRow}>
                        <View style={styles.tooltipLabelWrap}>
                            <View style={[styles.tooltipSwatch, { backgroundColor: COLOR_PNL }]} />
                            <Text style={styles.tooltipLabel}>Realized P&L</Text>
                        </View>
                        <Text
                            style={[
                                styles.tooltipValue,
                                {
                                    color:
                                        (activePoint.realizedPnl ?? 0) >= 0
                                            ? COLOR_PNL
                                            : COLOR_PNL_NEG,
                                },
                            ]}
                        >
                            {formatPnl(activePoint.realizedPnl ?? 0)}
                        </Text>
                    </View>
                    <View style={styles.tooltipRow}>
                        <View style={styles.tooltipLabelWrap}>
                            <View
                                style={[
                                    styles.tooltipSwatch,
                                    {
                                        backgroundColor: 'transparent',
                                        borderWidth: 1,
                                        borderColor: COLOR_PNL,
                                        borderStyle: 'dashed',
                                    },
                                ]}
                            />
                            <Text style={styles.tooltipLabel}>Unrealized P&L</Text>
                        </View>
                        <Text
                            style={[
                                styles.tooltipValue,
                                {
                                    color:
                                        (activePoint.unrealizedPnl ?? 0) >= 0
                                            ? COLOR_PNL
                                            : COLOR_PNL_NEG,
                                },
                            ]}
                        >
                            {formatPnl(activePoint.unrealizedPnl ?? 0)}
                        </Text>
                    </View>

                    {activePoint.intervalSoldCount > 0 && (
                        <View style={styles.tooltipSoldBlock}>
                            {activePoint.intervalItems.length > 0 ? (
                                <>
                                    {activePoint.intervalItems.slice(0, 5).map((it, i) => (
                                        <View key={i} style={styles.tooltipSoldRow}>
                                            <Text style={styles.tooltipSoldName} numberOfLines={1}>
                                                • {it.name}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.tooltipSoldPnl,
                                                    { color: it.pnl >= 0 ? COLOR_PNL : COLOR_PNL_NEG },
                                                ]}
                                            >
                                                {formatPnl(it.pnl)}
                                            </Text>
                                        </View>
                                    ))}
                                    {activePoint.intervalItems.length > 5 && (
                                        <Text style={styles.tooltipSoldMore}>
                                            +{activePoint.intervalItems.length - 5} more sold
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.tooltipSoldHeader}>
                                    Sold {activePoint.intervalSoldCount} item
                                    {activePoint.intervalSoldCount > 1 ? 's' : ''}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: c.borderLight,
        gap: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: c.text,
    },
    emptyState: {
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noData: {
        color: c.textSecondary,
        fontSize: 14,
    },
    hero: {
        gap: 10,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    heroLeft: {
        flexShrink: 1,
    },
    heroLabel: {
        fontSize: 11,
        color: c.textSecondary,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroValue: {
        fontSize: 28,
        fontWeight: '700',
        color: c.text,
        fontVariant: ['tabular-nums'],
        marginTop: 2,
    },
    heroSub: {
        fontSize: 11,
        color: c.textTertiary,
        marginTop: 2,
    },
    deltaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        marginTop: 16,
    },
    deltaChipText: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    inlineBreakdown: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    inlinePnl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    inlineSwatch: {
        width: 10,
        height: 3,
        borderRadius: 2,
    },
    inlineLabel: {
        fontSize: 12,
        color: c.textSecondary,
    },
    inlineValue: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    inlineSub: {
        fontSize: 11,
        color: c.textTertiary,
        fontVariant: ['tabular-nums'],
    },
    inlineSep: {
        fontSize: 12,
        color: c.textTertiary,
    },
    rangeRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    rangePills: {
        flexDirection: 'row',
        backgroundColor: c.background,
        borderRadius: 8,
        padding: 2,
        borderWidth: 1,
        borderColor: c.borderLight,
    },
    rangePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    rangePillActive: {
        backgroundColor: c.surfaceHighlight,
    },
    rangePillText: {
        fontSize: 11,
        color: c.textSecondary,
        fontWeight: '600',
    },
    rangePillTextActive: {
        color: c.accent,
    },
    axisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'flex-start',
    },
    axisText: {
        fontSize: 10,
        color: c.textTertiary,
    },
    tooltip: {
        backgroundColor: c.background,
        borderWidth: 1,
        borderColor: c.borderLight,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
    tooltipDate: {
        fontSize: 11,
        color: c.textSecondary,
        fontWeight: '600',
        marginBottom: 2,
    },
    tooltipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tooltipLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tooltipSwatch: {
        width: 10,
        height: 3,
        borderRadius: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: c.textSecondary,
    },
    tooltipValue: {
        fontSize: 12,
        color: c.text,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    tooltipSoldBlock: {
        marginTop: 4,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: COLOR_PNL,
        gap: 2,
    },
    tooltipSoldHeader: {
        fontSize: 10,
        color: COLOR_PNL,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    tooltipSoldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    tooltipSoldName: {
        fontSize: 10,
        color: c.textSecondary,
        flex: 1,
    },
    tooltipSoldPnl: {
        fontSize: 10,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    tooltipSoldMore: {
        fontSize: 10,
        color: c.textTertiary,
        fontStyle: 'italic',
    },
});
