import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { STAGE_ORDER, STAGE_LABELS, CHANNEL_LABELS, SaleChannel } from '@/constants/types';

const c = Colors.dark;

const STAGE_COLORS: Record<string, string> = {
  acquired: c.acquired,
  in_transit: c.inTransit,
  grading: c.grading,
  in_stock: c.inStock,
  listed: c.listed,
  sold: c.sold,
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { inventory, getTotalMarketValue, getForSaleCount, getSoldItems } = useApp();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const totalItems = inventory.length;
  const forSale = getForSaleCount();
  const marketValue = getTotalMarketValue();
  const soldItems = getSoldItems();

  const singleCards = inventory.filter((i) => i.type === 'single_card').length;
  const gradedCards = inventory.filter((i) => i.type === 'graded_card').length;
  const sealedProducts = inventory.filter((i) => i.type === 'sealed_product').length;

  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: inventory.filter((i) => i.stage === stage).length,
    color: STAGE_COLORS[stage],
  }));

  const maxStageCount = Math.max(...stageCounts.map((s) => s.count), 1);

  const channelCounts: { channel: SaleChannel; count: number }[] = [];
  const channelMap = new Map<SaleChannel, number>();
  soldItems.forEach((item) => {
    if (item.soldChannel) {
      channelMap.set(item.soldChannel, (channelMap.get(item.soldChannel) || 0) + 1);
    }
  });
  channelMap.forEach((count, channel) => {
    channelCounts.push({ channel, count });
  });
  channelCounts.sort((a, b) => b.count - a.count);

  const totalRevenue = soldItems.reduce((sum, i) => sum + (i.soldPrice || 0), 0);
  const totalCost = soldItems.reduce((sum, i) => sum + i.acquisitionPrice, 0);
  const profit = totalRevenue - totalCost;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SlabHub</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push('/add-item')}
        >
          <Ionicons name="add" size={20} color={c.accentText} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard icon="cube" label="Total Items" value={totalItems.toString()} />
          <StatCard icon="pricetag" label="For Sale" value={forSale.toString()} accent />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="trending-up" label="Market Value" value={`$${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} wide />
        </View>

        {soldItems.length > 0 && (
          <View style={styles.statsRow}>
            <StatCard icon="cash" label="Revenue" value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            <StatCard icon="analytics" label="Profit" value={`$${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} accent={profit > 0} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items by Stage</Text>
          <Text style={styles.cardSubtitle}>Distribution across pipeline</Text>
          <View style={styles.barChart}>
            {stageCounts.map((s) => (
              <View key={s.stage} style={styles.barRow}>
                <Text style={styles.barLabel}>{s.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(s.count / maxStageCount) * 100}%`,
                        backgroundColor: s.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{s.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Breakdown</Text>
          <View style={styles.breakdownRow}>
            <BreakdownItem icon="card" label="Raw Cards" count={singleCards} color={c.info} />
            <BreakdownItem icon="shield-checkmark" label="Graded" count={gradedCards} color={c.success} />
            <BreakdownItem icon="gift" label="Sealed" count={sealedProducts} color={c.warning} />
          </View>
        </View>

        {channelCounts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sales by Channel</Text>
            {channelCounts.map((ch) => (
              <View key={ch.channel} style={styles.channelRow}>
                <View style={[styles.channelDot, { backgroundColor: c.accent }]} />
                <Text style={styles.channelLabel}>{CHANNEL_LABELS[ch.channel]}</Text>
                <Text style={styles.channelCount}>{ch.count}</Text>
              </View>
            ))}
          </View>
        )}

        {inventory.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="cards-playing-outline" size={48} color={c.textTertiary} />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>Add your first card or sealed product to get started</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push('/add-item')}
            >
              <Text style={styles.emptyBtnText}>Add Item</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, accent, wide }: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={16} color={c.textSecondary} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, accent && { color: c.accent }]}>{value}</Text>
    </View>
  );
}

function BreakdownItem({ icon, label, count, color }: {
  icon: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={styles.breakdownItem}>
      <View style={[styles.breakdownIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.breakdownCount}>{count}</Text>
      <Text style={styles.breakdownLabel}>{label}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: c.text,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  statCardWide: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: c.text,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: c.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 16,
  },
  barChart: {
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    color: c.textSecondary,
    width: 70,
    fontWeight: '500' as const,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: c.surfaceHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  barValue: {
    fontSize: 13,
    color: c.text,
    fontWeight: '600' as const,
    width: 28,
    textAlign: 'right' as const,
  },
  breakdownRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  breakdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: c.text,
  },
  breakdownLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  channelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  channelLabel: {
    flex: 1,
    fontSize: 14,
    color: c.text,
    fontWeight: '500' as const,
  },
  channelCount: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '600' as const,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.borderLight,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: c.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: c.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.accentText,
  },
});
