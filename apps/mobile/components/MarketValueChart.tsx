import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Line } from 'react-native-svg';
import { PortfolioHistoryEntry } from '@/lib/types';
import Colors from '@/constants/colors';

const c = Colors.dark;

interface MarketValueChartProps {
    history: PortfolioHistoryEntry[];
    height?: number;
}

export function MarketValueChart({ history, height = 180 }: MarketValueChartProps) {
    const [containerWidth, setContainerWidth] = React.useState(0);

    if (!history || history.length === 0) {
        return (
            <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.noData}>No history data available</Text>
            </View>
        );
    }

    // Account for container padding (16 left + 16 right)
    const chartWidth = containerWidth > 0 ? containerWidth - 32 : Dimensions.get('window').width - 72;
    // Account for header/footer space if needed, but height is passed as prop
    const buffer = 10;
    const chartHeight = height - buffer * 2;

    const values = history.map(h => h.value);
    const costs = history.map(h => h.cost);
    const allPoints = [...values, ...costs];

    const minValue = Math.min(...allPoints);
    const maxValue = Math.max(...allPoints);
    const range = maxValue - minValue || 1;

    const getY = (v: number) => chartHeight - ((v - minValue) / range) * chartHeight + buffer;
    const getX = (i: number) => (i / (history.length - 1)) * chartWidth;

    const valuePoints = history.map((h, i) => `${getX(i)},${getY(h.value)}`).join(' ');
    const costPoints = history.map((h, i) => `${getX(i)},${getY(h.cost)}`).join(' ');

    const valuePath = `M ${valuePoints}`;
    const costPath = `M ${costPoints}`;

    const valueAreaPath = `${valuePath} L ${getX(history.length - 1)},${chartHeight} L 0,${chartHeight} Z`;
    const costAreaPath = `${costPath} L ${getX(history.length - 1)},${chartHeight} L 0,${chartHeight} Z`;

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return '';
            // Handle ISO strings or other formats safely
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    return (
        <View
            style={styles.container}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Est. Market Value</Text>
                    <Text style={styles.subtitle}>Last 30 days performance</Text>
                </View>
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: c.accent }]} />
                        <Text style={styles.legendText}>Value</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: c.textSecondary }]} />
                        <Text style={styles.legendText}>Cost</Text>
                    </View>
                </View>
            </View>

            <View style={{ height, width: chartWidth, overflow: 'hidden' }}>
                <Svg height={height} width={chartWidth}>
                    <Defs>
                        <LinearGradient id="gradientValue" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={c.accent} stopOpacity="0.3" />
                            <Stop offset="1" stopColor={c.accent} stopOpacity="0.01" />
                        </LinearGradient>
                        <LinearGradient id="gradientCost" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={c.textSecondary} stopOpacity="0.15" />
                            <Stop offset="1" stopColor={c.textSecondary} stopOpacity="0.01" />
                        </LinearGradient>
                    </Defs>

                    {/* Cost Area & Line */}
                    <Path d={costAreaPath} fill="url(#gradientCost)" />
                    <Path d={costPath} fill="none" stroke={c.textSecondary} strokeWidth="1.5" strokeOpacity="0.5" />

                    {/* Value Area & Line */}
                    <Path d={valueAreaPath} fill="url(#gradientValue)" />
                    <Path d={valuePath} fill="none" stroke={c.accent} strokeWidth="2.5" />

                    {/* Horizontal Grid lines (simplified) */}
                    <Line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={c.border} strokeWidth="1" />
                    <Line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke={c.border} strokeWidth="1" strokeDasharray="4 4" />
                </Svg>
            </View>

            <View style={styles.footer}>
                <Text style={styles.dateText}>{formatDate(history[0]?.date)}</Text>
                <Text style={styles.dateText}>{formatDate(history[history.length - 1]?.date)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: c.borderLight,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: c.text,
    },
    subtitle: {
        fontSize: 12,
        color: c.textSecondary,
        marginTop: 2,
    },
    legend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: c.textSecondary,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    dateText: {
        fontSize: 10,
        color: c.textTertiary,
    },
    noData: {
        color: c.textSecondary,
        fontSize: 14,
    }
});
