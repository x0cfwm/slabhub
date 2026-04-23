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
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { getMarketProduct } from '@/lib/api';
import MarketProductDetail from '@/components/pricing/MarketProductDetail';
import { ImageZoomModal } from '@/components/inventory/ImageZoomModal';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  TYPE_LABELS,
  CONDITION_LABELS,
  CHANNEL_LABELS,
  ItemStage,
} from '@/constants/types';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { ListedPromptDialog } from '@/components/inventory/ListedPromptDialog';
import { SoldPromptDialog } from '@/components/inventory/SoldPromptDialog';

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
  const { inventory, deleteItem, moveItem, updateItem, statuses } = useApp();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [listedPromptVisible, setListedPromptVisible] = React.useState(false);
  const [soldPromptVisible, setSoldPromptVisible] = React.useState(false);
  const [isZoomVisible, setIsZoomVisible] = React.useState(false);

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
            if (stage === 'listed') {
              setListedPromptVisible(true);
            } else if (stage === 'sold') {
              setSoldPromptVisible(true);
            } else {
              moveItem(item.id, stage);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
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
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/posting',
                params: {
                  mode: 'MANUAL',
                  itemId: item.id,
                },
              } as any)
            }
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={26} color={c.textSecondary} />
          </Pressable>
          <Pressable onPress={handleMove} hitSlop={8}>
            <Ionicons name="swap-horizontal" size={26} color={c.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push(`/add-item?id=${item.id}`)}
          >
            <Feather name="edit-2" size={18} color={c.accent} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {item.imageUri ? (
          <Pressable onPress={() => setIsZoomVisible(true)} style={styles.heroImageContainer}>
            <Image
              source={{ uri: getOptimizedImageUrl(item.imageUri, { height: 320 }) }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={15}
            />
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <Image
              source={{ uri: getOptimizedImageUrl(item.imageUri, { height: 800 }) }}
              style={styles.heroImage}
              contentFit="contain"
            />
            <View style={styles.heroZoomHint} pointerEvents="none">
              <Ionicons name="expand-outline" size={14} color="#fff" />
            </View>
          </Pressable>
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
          {(item.stage === 'listed' || item.stage === 'sold') ? (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Listed Price</Text>
              <Text style={styles.priceListed}>
                {item.listedPrice !== undefined && item.listedPrice > 0 
                  ? `$${(Number(item.listedPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : '—'}
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

        {item.stage === 'sold' && (
          <View style={styles.soldSection}>
            <View style={styles.soldRow}>
              <Text style={styles.soldLabel}>Sold For</Text>
              <Text style={styles.soldValue}>
                {item.soldPrice !== undefined 
                  ? `$${(Number(item.soldPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.soldRow}>
              <Text style={styles.soldLabel}>Sold Date</Text>
              <Text style={styles.soldDateText}>
                {item.soldDate ? new Date(item.soldDate).toLocaleDateString() : '—'}
              </Text>
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
          {item.listedPrice !== undefined && item.listedPrice > 0 && (
            <DetailRow label="Cost" value={`$${(Number(item.acquisitionPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          )}
          <DetailRow label="Added" value={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'} />
        </View>

        <GradingSection item={item} />

        {(item.sellingDescription || item.stage === 'listed') ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Public Description</Text>
            <Text style={styles.notesText}>{item.sellingDescription || 'No description provided'}</Text>
          </View>
        ) : null}

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

      <ListedPromptDialog
        isOpen={listedPromptVisible}
        onClose={() => setListedPromptVisible(false)}
        item={item}
        itemName={item?.name}
        onConfirm={async (data) => {
          const status = statuses.find(s => s.systemId === 'LISTED');
          await updateItem(item.id, {
            stage: 'listed',
            statusId: status?.id,
            listedPrice: data.listingPrice,
            sellingDescription: data.sellingDescription,
          } as any);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <SoldPromptDialog
        isOpen={soldPromptVisible}
        onClose={() => setSoldPromptVisible(false)}
        itemName={item?.name}
        listingPrice={item?.listedPrice}
        onConfirm={async (data) => {
          const status = statuses.find(s => s.systemId === 'SOLD');
          await updateItem(item.id, {
            stage: 'sold',
            statusId: status?.id,
            soldPrice: data.soldPrice,
            soldDate: data.soldDate,
          } as any);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ImageZoomModal
        isVisible={isZoomVisible}
        onClose={() => setIsZoomVisible(false)}
        imageUri={item.imageUri ? getOptimizedImageUrl(item.imageUri, { quality: 90 }) : null}
      />
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

function GradingSection({ item }: { item: any }) {
  const subgrades = item.gradingMeta?.subgrades;
  const hasSubgrades = subgrades && Object.values(subgrades).some((v) => v !== null && v !== undefined && v !== '');
  const hasGradingInfo = item.gradingCompany || item.grade || item.certNumber || hasSubgrades;

  if (!hasGradingInfo) return null;

  const headline = [item.gradingCompany, item.gradingMeta?.gradeLabel || item.grade]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.gradingSection}>
      <View style={styles.gradingHeaderRow}>
        <MaterialCommunityIcons name="shield-check-outline" size={18} color={c.accent} />
        <Text style={styles.gradingSectionTitle}>Grading</Text>
      </View>
      {headline ? <Text style={styles.gradingHeadline}>{headline}</Text> : null}
      {item.gradingCompany ? (
        <DetailRow label="Grading Company" value={item.gradingCompany} />
      ) : null}
      {item.grade ? <DetailRow label="Grade" value={String(item.grade)} /> : null}
      {item.certNumber ? <DetailRow label="Cert Number" value={String(item.certNumber)} /> : null}
      {hasSubgrades ? (
        <View style={styles.subgradesBlock}>
          <Text style={styles.subgradesLabel}>Subgrades</Text>
          <View style={styles.subgradesGrid}>
            {(['centering', 'corners', 'edges', 'surface'] as const).map((key) =>
              subgrades[key] !== undefined && subgrades[key] !== null && subgrades[key] !== '' ? (
                <View key={key} style={styles.subgradeChip}>
                  <Text style={styles.subgradeChipLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <Text style={styles.subgradeChipValue}>{String(subgrades[key])}</Text>
                </View>
              ) : null,
            )}
          </View>
        </View>
      ) : null}
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
    gap: 12,
    alignItems: 'center',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  heroImageContainer: {
    width: '100%',
    height: 380,
    backgroundColor: c.surfaceHighlight,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroZoomHint: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
  soldDateText: {
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
  gradingSection: {
    marginHorizontal: 20,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 10,
  },
  gradingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradingSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.text,
  },
  gradingHeadline: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: c.accent,
  },
  subgradesBlock: {
    gap: 8,
    marginTop: 4,
  },
  subgradesLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500' as const,
  },
  subgradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subgradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceHighlight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  subgradeChipLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  subgradeChipValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: c.text,
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
