import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Platform,
    Linking,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { MarketProduct, MarketPriceHistory } from '@/lib/types';
import { getProductPriceHistory } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/image-utils';

const c = Colors.dark;

interface MarketProductDetailProps {
    product: MarketProduct | null;
    onClose: () => void;
}

export default function MarketProductDetail({ product, onClose }: MarketProductDetailProps) {
    const [selectedGrade, setSelectedGrade] = useState<string>("Raw");
    const [refreshing, setRefreshing] = useState(false);
    const [gradePickerOpen, setGradePickerOpen] = useState(false);

    const { data: history, isLoading, error, refetch } = useQuery({
        queryKey: ['productPriceHistory', product?.id],
        queryFn: () => getProductPriceHistory(product!.id),
        enabled: !!product,
    });

    if (!product) return <View style={styles.container} />;

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const DISPLAY_LABELS: Record<string, string> = {
        "Raw": "Raw",
        "Grade 7": "PSA 7",
        "Grade 8": "PSA 8",
        "Grade 9": "PSA 9",
        "Grade 9.5": "BGS 9.5",
        "PSA 10": "PSA 10",
    };

    const GRADE_GROUPS = [
        { id: "Raw", label: "Raw", members: ["Raw"] },
        { id: "Pristine", label: "Perfect 10", members: ["CGC 10 Prist.", "CGC 10 Pristine", "BGS 10 Black"] },
        { id: "Ten", label: "Grade 10", members: ["PSA 10", "BGS 10", "CGC 10", "SGC 10", "TAG 10", "ACE 10"] },
        { id: "High", label: "Grades 9–9.5", members: ["Grade 9", "Grade 9.5"] },
        { id: "Mid", label: "Grades 7–8", members: ["Grade 7", "Grade 8"] },
        { id: "Low", label: "Grades 1–6", members: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"] },
    ];

    const summaryPrice = (id: string): number | undefined => {
        switch (id) {
            case "Raw": return (history?.updatedRawPrice ?? product.rawPrice) ?? undefined;
            case "Grade 7": return history?.summary?.grade7 ?? product.grade7Price ?? undefined;
            case "Grade 8": return history?.summary?.grade8 ?? product.grade8Price ?? undefined;
            case "Grade 9": return history?.summary?.grade9 ?? product.grade9Price ?? undefined;
            case "Grade 9.5": return history?.summary?.grade95 ?? product.grade95Price ?? undefined;
            case "PSA 10": return history?.summary?.psa10 ?? product.grade10Price ?? undefined;
            default: return undefined;
        }
    };

    const medianSalePrice = (id: string): number | undefined => {
        const pricesForGrade = (history?.prices ?? [])
            .filter(p => (p.grade === id) || (!p.grade && id === "Raw"))
            .map(p => p.price)
            .sort((a, b) => a - b);
        if (pricesForGrade.length === 0) return undefined;
        const mid = Math.floor(pricesForGrade.length / 2);
        return pricesForGrade.length % 2
            ? pricesForGrade[mid]
            : (pricesForGrade[mid - 1] + pricesForGrade[mid]) / 2;
    };

    const salesCount = (id: string): number =>
        (history?.prices ?? []).filter(p => (p.grade === id) || (!p.grade && id === "Raw")).length;

    const formatPrice = (n: number) =>
        `$${n < 1 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;

    const gradeIds = new Set<string>(["Raw", "Grade 7", "Grade 8", "Grade 9", "Grade 9.5", "PSA 10"]);
    (history?.prices ?? []).forEach(p => {
        if (p.grade) gradeIds.add(p.grade);
    });

    const gradeConfigs = Array.from(gradeIds)
        .map(id => ({
            key: id,
            label: DISPLAY_LABELS[id] ?? id,
            price: summaryPrice(id) ?? medianSalePrice(id),
            sales: salesCount(id),
        }))
        .filter(e => e.price && e.price > 0);

    const groupsWithData = GRADE_GROUPS
        .map(group => {
            const members = group.members
                .map(id => gradeConfigs.find(g => g.key === id))
                .filter((g): g is typeof gradeConfigs[number] => !!g)
                .sort((a, b) => b.sales - a.sales);
            return { ...group, grades: members };
        })
        .filter(g => g.grades.length > 0);

    const allGrades = groupsWithData.flatMap(g => g.grades);
    const selected = allGrades.find(g => g.key === selectedGrade) ?? allGrades[0];

    const selectedSales = (history?.prices ?? [])
        .filter(p => (p.grade === selected?.key) || (!p.grade && selected?.key === "Raw"))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));
    const selectedSalesPrices = selectedSales.map(s => s.price);
    const selectedMin = selectedSalesPrices.length ? Math.min(...selectedSalesPrices) : selected?.price ?? 0;
    const selectedMax = selectedSalesPrices.length ? Math.max(...selectedSalesPrices) : selected?.price ?? 0;
    const showRange = selectedSalesPrices.length > 1 && selectedMin !== selectedMax;

    const filteredPrices = (history?.prices ?? [])
        .filter(entry => !entry.grade || entry.grade === selectedGrade);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
                <Pressable onPress={handleRefresh} disabled={isLoading || refreshing} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color={isLoading || refreshing ? c.textTertiary : c.accent} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.productInfo}>
                    {product.imageUrl && (
                        <Image source={{ uri: getOptimizedImageUrl(product.imageUrl, { height: 400 }) }} style={styles.productImage} contentFit="cover" />
                    )}
                    <View style={styles.productMeta}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.badgeRow}>
                            <Text style={styles.productNumber}>{product.number}</Text>
                            {Boolean(product.source && !product.source.toLowerCase().includes('pricecharting')) && (
                                <View style={styles.sourceBadge}>
                                    <Text style={styles.sourceText}>{product.source}</Text>
                                </View>
                            )}
                        </View>

                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MARKET ESTIMATES</Text>
                    {groupsWithData.length === 0 ? (
                        <Text style={styles.emptyEstimates}>No price estimates yet.</Text>
                    ) : selected ? (
                        <View style={styles.estimatesBlock}>
                            <Pressable
                                style={styles.gradeTrigger}
                                onPress={() => setGradePickerOpen(true)}
                            >
                                <Text style={styles.gradeTriggerLabel}>{selected.label}</Text>
                                <View style={styles.gradeTriggerRight}>
                                    <Text style={styles.gradeTriggerPrice}>
                                        {formatPrice(selected.price!)}
                                        {selected.sales > 0 ? `  ·  ${selected.sales} sales` : ''}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
                                </View>
                            </Pressable>

                            <View style={styles.detailCard}>
                                <View style={styles.detailLeft}>
                                    <Text style={styles.detailGrade}>{selected.label}</Text>
                                    <Text style={styles.detailPrice}>{formatPrice(selected.price!)}</Text>
                                    <Text style={styles.detailSubtitle}>
                                        {selected.sales > 0
                                            ? `median of ${selected.sales} recent sale${selected.sales === 1 ? '' : 's'}`
                                            : 'no recent sales — catalog estimate'}
                                    </Text>
                                </View>
                                <View style={styles.detailRight}>
                                    {showRange && (
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.detailRangeLabel}>RANGE</Text>
                                            <Text style={styles.detailRangeValue}>
                                                {formatPrice(selectedMin)} – {formatPrice(selectedMax)}
                                            </Text>
                                        </View>
                                    )}
                                    {selectedSalesPrices.length >= 2 && (
                                        <Sparkline data={selectedSalesPrices} width={104} height={36} />
                                    )}
                                </View>
                            </View>
                        </View>
                    ) : null}
                </View>

                <Modal
                    visible={gradePickerOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setGradePickerOpen(false)}
                >
                    <Pressable style={styles.modalBackdrop} onPress={() => setGradePickerOpen(false)}>
                        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Select Grade</Text>
                            <ScrollView style={{ maxHeight: 460 }}>
                                {groupsWithData.map(group => (
                                    <View key={group.id} style={styles.modalGroup}>
                                        <Text style={styles.modalGroupLabel}>{group.label}</Text>
                                        {group.grades.map(g => {
                                            const isActive = g.key === selectedGrade;
                                            return (
                                                <Pressable
                                                    key={g.key}
                                                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                                                    onPress={() => {
                                                        setSelectedGrade(g.key);
                                                        setGradePickerOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.modalItemLabel, isActive && styles.modalItemLabelActive]}>
                                                        {g.label}
                                                    </Text>
                                                    <Text style={[styles.modalItemMeta, isActive && styles.modalItemMetaActive]}>
                                                        {formatPrice(g.price!)}
                                                        {g.sales > 0 ? `  ·  ${g.sales}` : ''}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                <View style={styles.lastUpdatedRow}>
                    <Text style={styles.lastUpdatedLabel}>Last updated</Text>
                    <Text style={styles.lastUpdatedValue}>{new Date(product.lastUpdated).toLocaleString()}</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.salesHeader}>
                        <Text style={styles.sectionTitle}>RECENT SALES</Text>

                    </View>

                    {isLoading ? (
                        <ActivityIndicator color={c.accent} style={{ marginVertical: 20 }} />
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Failed to load sales data</Text>
                        </View>
                    ) : filteredPrices.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No recent sales found for {selectedGrade}</Text>
                        </View>
                    ) : (
                        <View style={styles.salesList}>
                            {filteredPrices.slice(0, 10).map((sale, idx) => (
                                <Pressable
                                    key={idx}
                                    style={({ pressed }) => [
                                        styles.saleRow,
                                        pressed && sale.link && { backgroundColor: c.surfaceHighlight }
                                    ]}
                                    onPress={() => {
                                        if (sale.link) {
                                            Linking.openURL(sale.link).catch((err: any) =>
                                                console.error("Failed to open URL", err)
                                            );
                                        }
                                    }}
                                >
                                    <View style={styles.saleMain}>
                                        <Text style={styles.saleDate}>{sale.date}</Text>
                                        <Text style={styles.saleTitle} numberOfLines={2}>{sale.title}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View style={styles.saleSide}>
                                            <Text style={styles.salePrice}>${sale.price.toFixed(2)}</Text>
                                            {Boolean(sale.source && !sale.source.toLowerCase().includes('pricecharting')) && (
                                                <View style={[
                                                    styles.sourceBadgeSmall,
                                                    { borderColor: sale.source === 'eBay' ? '#0064D240' : '#FF620040' }
                                                ]}>
                                                    <Text style={[
                                                        styles.sourceTextSmall,
                                                        { color: sale.source === 'eBay' ? '#5BA3F5' : '#FF9050' }
                                                    ]}>
                                                        {sale.source}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {sale.link && (
                                            <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.borderLight,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: c.text,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    closeButton: {
        padding: 5,
    },
    refreshButton: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    productInfo: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    productImage: {
        width: 80,
        height: 112,
        borderRadius: 8,
        backgroundColor: c.surface,
    },
    productMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 20,
        fontWeight: '700',
        color: c.text,
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    productNumber: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: c.textSecondary,
    },
    sourceBadge: {
        backgroundColor: c.surfaceHighlight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sourceText: {
        fontSize: 10,
        fontWeight: '600',
        color: c.textSecondary,
    },

    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: c.textTertiary,
        letterSpacing: 1,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    estimatesBlock: {
        paddingHorizontal: 20,
        gap: 10,
    },
    emptyEstimates: {
        paddingHorizontal: 20,
        fontSize: 13,
        color: c.textTertiary,
        fontStyle: 'italic',
    },
    gradeTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.borderLight,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    gradeTriggerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: c.text,
    },
    gradeTriggerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    gradeTriggerPrice: {
        fontSize: 12,
        color: c.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    detailCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 18,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F59E0B40',
        backgroundColor: '#F59E0B12',
        gap: 12,
    },
    detailLeft: {
        flex: 1,
    },
    detailGrade: {
        fontSize: 10,
        fontWeight: '800',
        color: '#F59E0B',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    detailPrice: {
        fontSize: 32,
        fontWeight: '800',
        color: c.text,
        marginTop: 4,
        fontVariant: ['tabular-nums'],
    },
    detailSubtitle: {
        fontSize: 11,
        color: c.textTertiary,
        marginTop: 4,
    },
    detailRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
        minHeight: 60,
    },
    detailRangeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: c.textTertiary,
        letterSpacing: 1,
    },
    detailRangeValue: {
        fontSize: 11,
        fontWeight: '700',
        color: c.text,
        marginTop: 2,
        fontVariant: ['tabular-nums'],
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: c.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 28,
    },
    modalHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.borderLight,
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: c.text,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    modalGroup: {
        marginBottom: 8,
    },
    modalGroupLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: c.textTertiary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
    },
    modalItemActive: {
        backgroundColor: '#F59E0B18',
    },
    modalItemLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
    },
    modalItemLabelActive: {
        color: '#FBBF24',
    },
    modalItemMeta: {
        fontSize: 12,
        color: c.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    modalItemMetaActive: {
        color: '#FBBF24',
    },
    lastUpdatedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: c.surface,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 10,
    },
    lastUpdatedLabel: {
        fontSize: 12,
        color: c.textSecondary,
        fontStyle: 'italic',
    },
    lastUpdatedValue: {
        fontSize: 12,
        color: c.textSecondary,
    },
    salesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 20,
    },

    salesList: {
        marginHorizontal: 20,
        backgroundColor: c.surface,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.borderLight,
    },
    saleRow: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.borderLight,
    },
    saleMain: {
        flex: 1,
        marginRight: 10,
    },
    saleDate: {
        fontSize: 11,
        fontWeight: '600',
        color: c.textSecondary,
        marginBottom: 2,
    },
    saleTitle: {
        fontSize: 12,
        color: c.text,
        lineHeight: 16,
    },
    saleSide: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
    },
    salePrice: {
        fontSize: 14,
        fontWeight: '700',
        color: c.text,
    },
    sourceBadgeSmall: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    sourceTextSmall: {
        fontSize: 9,
        fontWeight: '600',
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: c.textTertiary,
        fontSize: 14,
        textAlign: 'center',
    },
});

function Sparkline({ data, width, height }: { data: number[]; width: number; height: number }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const padY = 2;
    const inner = height - padY * 2;
    const points = data
        .map((v, i) => `${(i * stepX).toFixed(2)},${(height - padY - ((v - min) / range) * inner).toFixed(2)}`)
        .join(' ');
    const stroke = data[data.length - 1] >= data[0] ? '#10b981' : '#ef4444';
    return (
        <Svg width={width} height={height}>
            <Polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}
