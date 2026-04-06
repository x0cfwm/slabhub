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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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

    const estimates = [
        { label: "Raw", price: history?.updatedRawPrice ?? product.rawPrice, key: "Raw" },
        { label: "PSA 7", price: history?.summary?.grade7 ?? product.grade7Price, key: "Grade 7" },
        { label: "PSA 8", price: history?.summary?.grade8 ?? product.grade8Price, key: "Grade 8" },
        { label: "PSA 9", price: history?.summary?.grade9 ?? product.grade9Price, key: "Grade 9" },
        { label: "BGS 9.5", price: history?.summary?.grade95 ?? product.grade95Price, key: "Grade 9.5" },
        { label: "PSA 10", price: history?.summary?.psa10 ?? product.grade10Price, key: "PSA 10" },
    ].filter(e => e.price && e.price > 0);

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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.estimatesRow}>
                        {estimates.map((est) => (
                            <Pressable
                                key={est.key}
                                style={[
                                    styles.estimateCard,
                                    selectedGrade === est.key && styles.estimateCardActive
                                ]}
                                onPress={() => setSelectedGrade(est.key)}
                            >
                                <Text style={[styles.estimateLabel, selectedGrade === est.key && styles.estimateLabelActive]}>
                                    {est.label}
                                </Text>
                                <Text style={[styles.estimatePrice, selectedGrade === est.key && styles.estimatePriceActive]}>
                                    ${Math.round(est.price!).toLocaleString()}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

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
    estimatesRow: {
        paddingHorizontal: 20,
        gap: 10,
    },
    estimateCard: {
        width: 100,
        padding: 12,
        borderRadius: 12,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.borderLight,
    },
    estimateCardActive: {
        backgroundColor: '#F59E0B10', // amber-500/10
        borderColor: '#F59E0B',
    },
    estimateLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: c.textTertiary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    estimateLabelActive: {
        color: '#F59E0B',
    },
    estimatePrice: {
        fontSize: 16,
        fontWeight: '700',
        color: c.text,
    },
    estimatePriceActive: {
        color: '#FBBF24', // amber-400
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
