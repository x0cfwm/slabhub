import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { getMarketProduct } from '@/lib/api';
import MarketProductDetail from '@/components/pricing/MarketProductDetail';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  TYPE_LABELS,
  CONDITION_LABELS,
  CHANNEL_LABELS,
  ItemStage,
} from '@/constants/types';
import { getOptimizedImageUrl } from '@/lib/image-utils';

const c = Colors.dark;

const STAGE_COLORS: Record<ItemStage, string> = {
  acquired: c.acquired,
  in_transit: c.inTransit,
  grading: c.grading,
  in_stock: c.inStock,
  listed: c.listed,
  sold: c.sold,
};

export default function ItemDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { inventory, deleteItem, moveItem } = useApp();
  const [modalVisible, setModalVisible] = React.useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const item = inventory.find((i) => i.id === id);

  const { data: marketProduct } = useQuery({
    queryKey: ['marketProduct', item?.refPriceChartingProductId],
    queryFn: () => getMarketProduct(item!.refPriceChartingProductId!),
    enabled: !!item?.refPriceChartingProductId,
  });

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Item not found</Text>
        </View>
      </View>
    );
  }

  const stageColor = STAGE_COLORS[item.stage];
  const profit = (item.soldPrice || 0) - item.acquisitionPrice;

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      deleteItem(item.id);
      router.back();
    } else {
      Alert.alert('Delete Item', `Delete "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteItem(item.id);
            router.back();
          },
        },
      ]);
    }
  };

  const handleMove = () => {
    const currentIndex = STAGE_ORDER.indexOf(item.stage);
    const nextStages = STAGE_ORDER.filter((_, i) => i !== currentIndex);

    if (Platform.OS === 'web') {
      const nextIndex = (currentIndex + 1) % STAGE_ORDER.length;
      const nextStage = STAGE_ORDER[nextIndex];
      moveItem(item.id, nextStage);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Alert.alert('Move Item', 'Select stage:', [
        ...nextStages.map((stage) => ({
          text: STAGE_LABELS[stage],
          onPress: () => {
            moveItem(item.id, stage);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleMove} hitSlop={8}>
            <Ionicons name="swap-horizontal" size={24} color={c.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {item.imageUri ? (
          <Image source={{ uri: getOptimizedImageUrl(item.imageUri, { height: 800 }) }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <View style={styles.heroImagePlaceholder}>
            <MaterialCommunityIcons name="cards-playing-outline" size={64} color={c.textTertiary} />
          </View>
        )}

        <View style={styles.titleSection}>
          <View style={[styles.stagePill, { backgroundColor: stageColor + '20' }]}>
            <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
            <Text style={[styles.stagePillText, { color: stageColor }]}>{STAGE_LABELS[item.stage]}</Text>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>{item.setCode} {item.cardNumber} {item.setName ? `- ${item.setName}` : ''}</Text>
        </View>

        <View style={styles.priceRow}>
          <Pressable
            style={({ pressed }) => [
              styles.priceCard,
              { opacity: pressed && item.refPriceChartingProductId ? 0.7 : 1 }
            ]}
            onPress={() => item.refPriceChartingProductId && setModalVisible(true)}
          >
            <View style={styles.priceLabelRow}>
              <Text style={styles.priceLabel}>Market Price</Text>
              {item.refPriceChartingProductId && (
                <Ionicons name="information-circle-outline" size={14} color={c.textTertiary} />
              )}
            </View>
            <Text style={styles.priceValue}>
              ${(Number(item.marketPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </Pressable>
          {item.listedPrice !== undefined && item.listedPrice > 0 ? (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Listed Price</Text>
              <Text style={styles.priceListed}>
                ${(Number(item.listedPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ) : (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Cost</Text>
              <Text style={styles.priceCost}>
                ${(Number(item.acquisitionPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>

        {item.stage === 'sold' && item.soldPrice !== undefined && (
          <View style={styles.soldSection}>
            <View style={styles.soldRow}>
              <Text style={styles.soldLabel}>Sold For</Text>
              <Text style={styles.soldValue}>${(Number(item.soldPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            {item.soldChannel && CHANNEL_LABELS[item.soldChannel] && (
              <View style={styles.soldRow}>
                <Text style={styles.soldLabel}>Channel</Text>
                <Text style={styles.soldChannelText}>{CHANNEL_LABELS[item.soldChannel]}</Text>
              </View>
            )}
            <View style={styles.soldRow}>
              <Text style={styles.soldLabel}>Profit</Text>
              <Text style={[styles.soldProfit, { color: profit >= 0 ? c.success : c.error }]}>
                {profit >= 0 ? '+' : ''}${(Number(profit) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.detailsSection}>
          <DetailRow label="Type" value={TYPE_LABELS[item.type] || item.type} />
          <DetailRow label="Condition" value={CONDITION_LABELS[item.condition] || item.condition} />
          {item.gradingCompany && <DetailRow label="Grading Company" value={item.gradingCompany} />}
          {item.grade && <DetailRow label="Grade" value={item.grade} />}
          {item.listedPrice !== undefined && item.listedPrice > 0 && (
            <DetailRow label="Cost" value={`$${(Number(item.acquisitionPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          )}
          <DetailRow label="Added" value={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'} />
        </View>

        {item.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color={c.error} />
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <MarketProductDetail
          product={marketProduct || null}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  heroImage: {
    width: '100%',
    height: 320,
    backgroundColor: c.surfaceHighlight,
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    gap: 6,
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: c.text,
    lineHeight: 30,
  },
  itemMeta: {
    fontSize: 14,
    color: c.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  priceCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500' as const,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: c.accent,
  },
  priceListed: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: c.success,
  },
  priceCost: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: c.text,
  },
  soldSection: {
    marginHorizontal: 20,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 10,
  },
  soldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soldLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  soldValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: c.text,
  },
  soldChannelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.text,
  },
  soldProfit: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailsSection: {
    marginHorizontal: 20,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.text,
  },
  notesSection: {
    marginHorizontal: 20,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 6,
  },
  notesSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.text,
  },
  notesText: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: c.text,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.error + '40',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.error,
  },
});
