import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getMarketProducts as apiGetMarketProducts,
  getMarketValueHistory,
} from '@/lib/api';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { MarketValueChart } from '@/components/MarketValueChart';
import Colors from '@/constants/colors';
import Constants from 'expo-constants';

const c = Colors.dark;

const STAGE_ORDER = ['acquired', 'in_transit', 'grading', 'in_stock', 'listed', 'sold'] as const;
const STAGE_LABELS: Record<string, string> = {
  acquired: 'Acquired',
  in_transit: 'In Transit',
  grading: 'Grading',
  in_stock: 'In Stock',
  listed: 'Listed',
  sold: 'Sold',
};

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
  const { inventory, statuses, isLoading: appLoading, profile } = useApp();
  const { signOut, user } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['market-products'],
    queryFn: () => apiGetMarketProducts({ page: 1, limit: 100 }),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['market-value-history', 90],
    queryFn: () => getMarketValueHistory(90),
  });

  const loading = appLoading || marketLoading || historyLoading;
  const marketProducts = React.useMemo(() => marketData?.items ?? [], [marketData?.items]);

  const stats = React.useMemo(() => {
    // Basic stats
    const totalItems = inventory.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const forSaleItems = inventory.filter(i => i.stage === "listed").reduce((acc, i) => acc + (i.quantity || 1), 0);
    const soldItems = inventory.filter(i => i.stage === "sold");

    // Revenue and Profit
    const totalRevenue = soldItems.reduce((sum, i) => sum + (i.soldPrice || 0), 0);
    const totalCost = soldItems.reduce((sum, i) => sum + (i.acquisitionPrice || 0), 0);
    const profit = totalRevenue - totalCost;

    // Market Value calculation matching web
    const marketValue = inventory.reduce((acc, item) => {
      // Don't include ARCHIVED items in market value if there were any
      if ((item.stage as string) === "archived" || (item.stage as string) === "ARCHIVED") return acc;

      const itType = (item as any).type || (item as any).itemType || "UNKNOWN";
      const isSealed = itType === "SEALED_PRODUCT" || itType === "sealed_product";
      let unitPrice = item.marketPrice ?? 0;

      if (!unitPrice) {
        const vid = (item as any).cardVariantId || (item as any).cardProfileId;
        const refId = item.refPriceChartingProductId;
        const marketProduct = marketProducts.find((p: any) => p.id === refId || p.id === vid);

        if (marketProduct) {
          if (isSealed) {
            unitPrice = marketProduct.sealedPrice ?? 0;
          } else if (itType === "SINGLE_CARD_GRADED" || itType === "graded_card") {
            const gradeStr = String((item as any).gradeValue || (item as any).grade || "").toLowerCase();
            const numericGrade = gradeStr.match(/\d+(\.\d+)?/)?.[0];

            if (numericGrade === '10') unitPrice = marketProduct.grade10Price ?? marketProduct.rawPrice ?? 0;
            else if (numericGrade === '9.5') unitPrice = marketProduct.grade95Price ?? marketProduct.rawPrice ?? 0;
            else if (numericGrade === '9') unitPrice = marketProduct.grade9Price ?? marketProduct.rawPrice ?? 0;
            else if (numericGrade === '8') unitPrice = marketProduct.grade8Price ?? marketProduct.rawPrice ?? 0;
            else if (numericGrade === '7') unitPrice = marketProduct.grade7Price ?? marketProduct.rawPrice ?? 0;
            else unitPrice = marketProduct.rawPrice ?? 0;
          } else {
            unitPrice = marketProduct.rawPrice ?? 0;
          }
        } else if (item.marketPriceSnapshot) {
          unitPrice = Number(item.marketPriceSnapshot);
        } else {
          unitPrice = Number(item.acquisitionPrice) || 0;
        }
      }

      return acc + (unitPrice * (item.quantity || 1));
    }, 0);

    // Items by Stage counts
    const STAGE_TO_SYSTEM_MAP: Record<string, string[]> = {
      acquired: ['ACQUIRED', 'ARCHIVED'],
      in_transit: ['IN_TRANSIT'],
      grading: ['BEING_GRADED'],
      in_stock: ['IN_STOCK', 'AUTHENTICATED'],
      listed: ['LISTED'],
      sold: ['SOLD'],
    };

    const visibleStages = STAGE_ORDER.filter(s => {
      const allowedSystemIds = STAGE_TO_SYSTEM_MAP[s] || [s.toUpperCase()];
      const status = statuses.find(ws => allowedSystemIds.includes(ws.systemId));
      return status ? status.showOnKanban : true;
    });

    const stageCounts = visibleStages.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: inventory.filter((i) => i.stage === stage).reduce((acc, i) => acc + (i.quantity || 1), 0),
      color: STAGE_COLORS[stage],
    }));
    const maxStageCount = Math.max(...stageCounts.map((s) => s.count), 1);

    // Inventory Breakdown counts
    const rawCards = inventory.filter((i) => {
      const type = (i as any).type || (i as any).itemType;
      return type === 'SINGLE_CARD_RAW' || type === 'single_card' || type === 'raw';
    }).reduce((acc, i) => acc + (i.quantity || 1), 0);

    const gradedCards = inventory.filter((i) => {
      const type = (i as any).type || (i as any).itemType;
      return type === 'SINGLE_CARD_GRADED' || type === 'graded_card' || type === 'graded';
    }).reduce((acc, i) => acc + (i.quantity || 1), 0);

    const sealedProducts = inventory.filter((i) => {
      const type = (i as any).type || (i as any).itemType;
      return type === 'SEALED_PRODUCT' || type === 'sealed_product' || type === 'sealed';
    }).reduce((acc, i) => acc + (i.quantity || 1), 0);

    return {
      totalItems,
      forSaleItems,
      marketValue,
      totalRevenue,
      profit,
      stageCounts,
      maxStageCount,
      rawCards,
      gradedCards,
      sealedProducts
    };
  }, [inventory, marketProducts, statuses]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.avatarBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowAccount(true)}
          >
            <Text style={styles.avatarBtnText}>
              {(profile.username || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </Pressable>
          <View>
            <Text style={styles.brand}>SlabHub</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerActions}>

          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/add-item')}
          >
            <Ionicons name="add" size={20} color={c.accentText} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <MarketValueChart items={inventory} history={historyData || []} />

        <View style={styles.statsRow}>
          <StatCard icon="cube" label="Total Items" value={stats.totalItems.toString()} />
          <StatCard icon="pricetag" label="For Sale" value={stats.forSaleItems.toString()} accentColor={c.warning} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items by Stage</Text>
          <Text style={styles.cardSubtitle}>Distribution across pipeline</Text>
          <View style={styles.barChart}>
            {stats.stageCounts.map((s) => (
              <View key={s.stage} style={styles.barRow}>
                <Text style={styles.barLabel}>{s.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(s.count / stats.maxStageCount) * 100}%`,
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
            <BreakdownItem icon="card" label="Raw Cards" count={stats.rawCards} color={c.info} />
            <BreakdownItem icon="shield-checkmark" label="Graded" count={stats.gradedCards} color={c.success} />
            <BreakdownItem icon="gift" label="Sealed" count={stats.sealedProducts} color={c.warning} />
          </View>
        </View>

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

      {/* Account Bottom Sheet */}
      <Modal visible={showAccount} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAccount(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.accountSheet}>
                <View style={styles.accountSheetHandle} />
                <View style={styles.accountHeader}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>
                      {(profile.username || user?.email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {profile.username || 'My Shop'}
                    </Text>
                    <Text style={styles.accountEmail} numberOfLines={1}>
                      {user?.email || ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.accountDivider} />
                <Pressable
                  style={({ pressed }) => [styles.accountRow, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={async () => {
                    setShowAccount(false);
                    try { await Linking.openURL('https://slabhub.gg'); } catch {}
                  }}
                >
                  <Ionicons name="globe-outline" size={18} color={c.accent} />
                  <Text style={styles.accountRowText}>Open SlabHub.gg</Text>
                </Pressable>
                <View style={styles.accountDivider} />
                <Pressable
                  style={({ pressed }) => [styles.accountRow, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => {
                    setShowAccount(false);
                    if (Platform.OS === 'web') {
                      if (window.confirm('Are you sure you want to log out?')) {
                        signOut();
                      }
                    } else {
                      Alert.alert(
                        'Logout',
                        'Are you sure you want to log out?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Logout', style: 'destructive', onPress: signOut },
                        ]
                      );
                    }
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color={c.error} />
                  <Text style={[styles.accountRowText, { color: c.error }]}>Log Out</Text>
                </Pressable>
                <Text style={styles.accountVersion}>
                  Version {Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? 'unknown'}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function StatCard({ icon, label, value, wide, accentColor }: {
  icon: string;
  label: string;
  value: string;
  wide?: boolean;
  accentColor?: string;
}) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={14} color={c.textSecondary} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, accentColor && { color: accentColor }]}>{value}</Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
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
    gap: 12,
  },
  barLabel: {
    fontSize: 12,
    color: c.textSecondary,
    width: 60,
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
    minWidth: 24,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  avatarBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: c.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  accountSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  accountSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  accountAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: c.accent,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: c.text,
  },
  accountEmail: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  accountDivider: {
    height: 1,
    backgroundColor: c.borderLight,
    marginVertical: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  accountRowText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: c.text,
  },
  accountVersion: {
    fontSize: 12,
    color: c.textTertiary,
    textAlign: 'center' as const,
    marginTop: 16,
  },
});
