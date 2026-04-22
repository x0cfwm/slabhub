import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import {
  ItemStage,
  STAGE_ORDER,
  STAGE_LABELS,
  InventoryItem,
  CONDITION_LABELS,
  TYPE_LABELS,
} from '@/constants/types';
import { ListedPromptDialog } from '@/components/inventory/ListedPromptDialog';
import { SoldPromptDialog } from '@/components/inventory/SoldPromptDialog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const c = Colors.dark;

const STAGE_COLORS: Record<ItemStage, string> = {
  acquired: c.acquired,
  in_transit: c.inTransit,
  grading: c.grading,
  in_stock: c.inStock,
  listed: c.listed,
  sold: c.sold,
};

type TabItem = {
  stage: ItemStage | 'all';
  label: string;
  count: number;
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { inventory, deleteItem, moveItem, updateItem, refreshInventory, statuses } = useApp();
  const [activeStage, setActiveStage] = useState<ItemStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [listedPromptVisible, setListedPromptVisible] = useState(false);
  const [soldPromptVisible, setSoldPromptVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Map ItemStage (lowercase) to backend systemIds
  const STAGE_TO_SYSTEM_MAP: Record<ItemStage, string[]> = {
    acquired: ['ACQUIRED', 'ARCHIVED'],
    in_transit: ['IN_TRANSIT'],
    grading: ['BEING_GRADED'],
    in_stock: ['IN_STOCK', 'AUTHENTICATED'],
    listed: ['LISTED'],
    sold: ['SOLD'],
  };

  const visibleStages = useMemo(() => {
    if (!statuses || statuses.length === 0) return STAGE_ORDER;
    
    return STAGE_ORDER.filter(s => {
      const allowedSystemIds = STAGE_TO_SYSTEM_MAP[s] || [s.toUpperCase()];
      // Find any status belonging to this semantic group
      const status = statuses.find(ws => allowedSystemIds.includes(ws.systemId));
      
      // Only hide if we found the status and it's explicitly hidden
      return status ? status.showOnKanban : true;
    });
  }, [statuses]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshInventory();
    setIsRefreshing(false);
  }, [refreshInventory]);

  useFocusEffect(
    useCallback(() => {
      refreshInventory();
    }, [refreshInventory])
  );

  const pagerRef = useRef<FlatList>(null);
  const tabsRef = useRef<FlatList>(null);

  const stageCountMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((item) => {
      map.set(item.stage, (map.get(item.stage) || 0) + 1);
    });
    return map;
  }, [inventory]);

  const tabs: TabItem[] = useMemo(() => [
    { stage: 'all' as const, label: 'All', count: inventory.length },
    ...visibleStages.map((s) => ({
      stage: s,
      label: STAGE_LABELS[s],
      count: stageCountMap.get(s) || 0,
    })),
  ], [inventory.length, stageCountMap, visibleStages]);

  const handleStageChange = useCallback((stage: ItemStage | 'all') => {
    setActiveStage(stage);
    const index = tabs.findIndex((t) => t.stage === stage);
    if (index !== -1) {
      pagerRef.current?.scrollToIndex({ index, animated: true });
      tabsRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [tabs]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const stage = tabs[index].stage;
    setActiveStage(stage);
    tabsRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [tabs]);

  const handleMoveItem = useCallback((item: InventoryItem) => {
    const currentIndex = STAGE_ORDER.indexOf(item.stage);
    const nextStages = STAGE_ORDER.filter((_, i) => i !== currentIndex);

    if (Platform.OS === 'web') {
      const nextIndex = (currentIndex + 1) % STAGE_ORDER.length;
      const nextStage = STAGE_ORDER[nextIndex];
      moveItem(item.id, nextStage);
    } else {
      const enabledNextStages = nextStages.filter(s => {
        const allowedSystemIds = STAGE_TO_SYSTEM_MAP[s] || [s.toUpperCase()];
        const status = statuses.find(ws => allowedSystemIds.includes(ws.systemId));
        return status ? status.isEnabled : true;
      });

      Alert.alert(
        'Move Item',
        `Move "${item.name}" to:`,
        [
          ...enabledNextStages.map((stage) => ({
            text: STAGE_LABELS[stage],
            onPress: () => {
              if (stage === 'listed') {
                setSelectedItem(item);
                setListedPromptVisible(true);
              } else if (stage === 'sold') {
                setSelectedItem(item);
                setSoldPromptVisible(true);
              } else {
                moveItem(item.id, stage);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            },
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }, [moveItem, statuses]);

  const renderInventoryItem = useCallback(({ item }: { item: InventoryItem }) => (
    <InventoryCard
      item={item}
      onMove={() => handleMoveItem(item)}
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
    />
  ), [handleMoveItem]);

  const renderPage = useCallback(({ item: tab }: { item: TabItem }) => {
    const filteredItems = inventory.filter((item) => {
      const matchesStage = tab.stage === 'all' || item.stage === tab.stage;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStage && matchesSearch;
    });

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <FlatList
          data={filteredItems}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
              colors={[c.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cards-playing-outline" size={48} color={c.textTertiary} />
              <Text style={styles.emptyTitle}>
                {tab.stage === 'all' ? 'No items yet' : `No ${STAGE_LABELS[tab.stage as ItemStage]} items`}
              </Text>
              <Text style={styles.emptyText}>
                {tab.stage === 'all' ? 'Tap + to add your first item' : 'Items will appear here when moved to this stage'}
              </Text>
            </View>
          }
        />
      </View>
    );
  }, [inventory, searchQuery, renderInventoryItem, insets.bottom]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SlabHub</Text>
          <Text style={styles.title}>Inventory</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryHeaderBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowWorkflowModal(true)}
          >
            <Ionicons name="options-outline" size={18} color={c.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryHeaderBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/posting' as any)}
          >
            <Ionicons name="sparkles-outline" size={18} color={c.accent} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/add-item')}
          >
            <Ionicons name="add" size={20} color={c.accentText} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={c.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={c.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={c.textTertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.stageTabsContainer}>
        <FlatList
          ref={tabsRef}
          horizontal
          data={tabs}
          renderItem={({ item: tab }) => (
            <Pressable
              style={[
                styles.stageTab,
                activeStage === tab.stage && styles.stageTabActive,
                activeStage === tab.stage && tab.stage !== 'all' && { borderColor: STAGE_COLORS[tab.stage as ItemStage] },
              ]}
              onPress={() => handleStageChange(tab.stage)}
            >
              {tab.stage !== 'all' && (
                <View style={[styles.stageDot, { backgroundColor: STAGE_COLORS[tab.stage as ItemStage] }]} />
              )}
              <Text style={[styles.stageTabText, activeStage === tab.stage && styles.stageTabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.stageBadge, activeStage === tab.stage && styles.stageBadgeActive]}>
                <Text style={[styles.stageBadgeText, activeStage === tab.stage && styles.stageBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => item.stage}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageTabs}
          getItemLayout={(_, index) => ({
            length: 100, // Approximate tab width
            offset: 100 * index,
            index,
          })}
        />
      </View>

      <FlatList
        ref={pagerRef}
        horizontal
        pagingEnabled
        data={tabs}
        renderItem={renderPage}
        keyExtractor={(item) => item.stage}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={2}
        windowSize={3}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          pagerRef.current?.scrollToIndex({ index: info.index, animated: true });
        }}
      />
      <ListedPromptDialog
        isOpen={listedPromptVisible}
        onClose={() => setListedPromptVisible(false)}
        item={selectedItem}
        itemName={selectedItem?.name}
        onConfirm={async (data) => {
          if (selectedItem) {
            const status = statuses.find(s => s.systemId === 'LISTED');
            await updateItem(selectedItem.id, {
              stage: 'listed',
              statusId: status?.id,
              listedPrice: data.listingPrice,
              sellingDescription: data.sellingDescription,
            } as any);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }}
      />

      <SoldPromptDialog
        isOpen={soldPromptVisible}
        onClose={() => setSoldPromptVisible(false)}
        itemName={selectedItem?.name}
        listingPrice={selectedItem?.listedPrice}
        onConfirm={async (data) => {
          if (selectedItem) {
            const status = statuses.find(s => s.systemId === 'SOLD');
            await updateItem(selectedItem.id, {
              stage: 'sold',
              statusId: status?.id,
              soldPrice: data.soldPrice,
              soldDate: data.soldDate,
            } as any);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }}
      />

      <Modal visible={showWorkflowModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowWorkflowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalSheetHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Workflow & Kanban</Text>
                </View>
                <Text style={styles.modalSubtitle}>
                  Your workflow statuses control the stages of your inventory. Customize your Kanban board columns and colors on the SlabHub web app.
                </Text>
                
                <View style={styles.statusGrid}>
                  {statuses && statuses.length > 0 ? (
                    statuses.map((status) => (
                      <View
                        key={status.id}
                        style={[
                          styles.statusChip,
                          !status.isEnabled && styles.statusDisabled,
                          !status.showOnKanban && styles.statusHidden,
                        ]}
                      >
                        <View style={[styles.statusColor, { backgroundColor: status.color || '#94a3b8' }]} />
                        <Text style={[styles.statusChipText, !status.isEnabled && { color: c.textTertiary }]}>
                          {status.name}
                        </Text>
                        {!status.showOnKanban && (
                          <Feather name="eye-off" size={10} color={c.textTertiary} style={{ marginLeft: 4 }} />
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyStatusText}>No workflow statuses available.</Text>
                  )}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.webActionBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={async () => {
                    try { await Linking.openURL('https://slabhub.gg/shop-settings'); } catch {}
                  }}
                >
                  <Ionicons name="desktop-outline" size={16} color={c.textSecondary} />
                  <Text style={styles.webActionBtnText}>Edit on Web</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

function InventoryCard({ item, onMove, onPress }: {
  item: InventoryItem;
  onMove: () => void;
  onPress: () => void;
}) {
  const stageColor = STAGE_COLORS[item.stage];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        {item.imageUri ? (
          <Image source={{ uri: getOptimizedImageUrl(item.imageUri, { height: 300 }) }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <MaterialCommunityIcons name="cards-playing-outline" size={28} color={c.textTertiary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <View style={[styles.stagePill, { backgroundColor: stageColor + '20' }]}>
              <View style={[styles.stagePillDot, { backgroundColor: stageColor }]} />
              <Text style={[styles.stagePillText, { color: stageColor }]}>
                {STAGE_LABELS[item.stage]}
              </Text>
            </View>
            <Text style={styles.cardType}>{TYPE_LABELS[item.type]}</Text>
          </View>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.cardSet}>{item.setCode} {item.cardNumber}</Text>
          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardPriceLabel}>Market</Text>
              <Text style={styles.cardPrice}>${item.marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            {item.listedPrice !== undefined && item.listedPrice > 0 ? (
              <View>
                <Text style={styles.cardPriceLabel}>Listed</Text>
                <Text style={styles.cardListed}>${item.listedPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            ) : item.acquisitionPrice > 0 ? (
              <View>
                <Text style={styles.cardPriceLabel}>Cost</Text>
                <Text style={styles.cardCost}>${item.acquisitionPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            ) : null}
            <View style={styles.cardActions}>
              <Pressable onPress={onMove} hitSlop={8}>
                <Ionicons name="swap-horizontal" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    letterSpacing: 0,
  },
  stageTabsContainer: {
    maxHeight: 44,
    marginBottom: 8,
  },
  stageTabs: {
    paddingHorizontal: 20,
    gap: 8,
  },
  stageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 6,
  },
  stageTabActive: {
    backgroundColor: c.surfaceHighlight,
    borderColor: c.accent,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageTabText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  stageTabTextActive: {
    color: c.text,
  },
  stageBadge: {
    backgroundColor: c.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  stageBadgeActive: {
    backgroundColor: c.accent + '30',
  },
  stageBadgeText: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '600' as const,
  },
  stageBadgeTextActive: {
    color: c.accent,
  },
  listContent: {
    padding: 20,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
  },
  cardImage: {
    width: 100,
    alignSelf: 'stretch',
    minHeight: 140,
    backgroundColor: c.surfaceHighlight,
  },
  cardImagePlaceholder: {
    width: 100,
    alignSelf: 'stretch',
    minHeight: 140,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  stagePillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardType: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '500' as const,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.text,
    lineHeight: 20,
  },
  cardSet: {
    fontSize: 12,
    color: c.textTertiary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 4,
  },
  cardPriceLabel: {
    fontSize: 11,
    color: c.textTertiary,
    fontWeight: '500' as const,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: c.accent,
  },
  cardListed: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.success,
  },
  cardCost: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 'auto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: c.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 16,
    lineHeight: 18,
  },
  webActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 0,
  },
  webActionBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  statusDisabled: {
    opacity: 0.4,
    borderStyle: 'dashed' as const,
  },
  statusHidden: {
    opacity: 0.7,
    backgroundColor: 'transparent',
    borderColor: c.borderLight,
  },
  statusColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600' as const,
  },
  emptyStatusText: {
    fontSize: 14,
    color: c.textTertiary,
    fontStyle: 'italic' as const,
  },
});
