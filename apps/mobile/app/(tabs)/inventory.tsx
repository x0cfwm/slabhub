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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import {
  ItemStage,
  STAGE_ORDER,
  STAGE_LABELS,
  InventoryItem,
  CONDITION_LABELS,
  TYPE_LABELS,
} from '@/constants/types';

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
  const { inventory, deleteItem, moveItem, refreshInventory } = useApp();
  const [activeStage, setActiveStage] = useState<ItemStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

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
    ...STAGE_ORDER.map((s) => ({
      stage: s,
      label: STAGE_LABELS[s],
      count: stageCountMap.get(s) || 0,
    })),
  ], [inventory.length, stageCountMap]);

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

  const handleDelete = useCallback((item: InventoryItem) => {
    if (Platform.OS === 'web') {
      deleteItem(item.id);
    } else {
      Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
      ]);
    }
  }, [deleteItem]);

  const handleMoveItem = useCallback((item: InventoryItem) => {
    const currentIndex = STAGE_ORDER.indexOf(item.stage);
    const nextStages = STAGE_ORDER.filter((_, i) => i !== currentIndex);

    if (Platform.OS === 'web') {
      const nextIndex = (currentIndex + 1) % STAGE_ORDER.length;
      const nextStage = STAGE_ORDER[nextIndex];
      moveItem(item.id, nextStage);
    } else {
      Alert.alert(
        'Move Item',
        `Move "${item.name}" to:`,
        [
          ...nextStages.map((stage) => ({
            text: STAGE_LABELS[stage],
            onPress: () => moveItem(item.id, stage),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }, [moveItem]);

  const renderInventoryItem = useCallback(({ item }: { item: InventoryItem }) => (
    <InventoryCard
      item={item}
      onDelete={() => handleDelete(item)}
      onMove={() => handleMoveItem(item)}
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
    />
  ), [handleDelete, handleMoveItem]);

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
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push('/add-item')}
        >
          <Ionicons name="add" size={20} color={c.accentText} />
        </Pressable>
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
    </View>
  );
}

function InventoryCard({ item, onDelete, onMove, onPress }: {
  item: InventoryItem;
  onDelete: () => void;
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
          <Image source={{ uri: item.imageUri }} style={styles.cardImage} contentFit="cover" />
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
            {item.acquisitionPrice > 0 && (
              <View>
                <Text style={styles.cardPriceLabel}>Cost</Text>
                <Text style={styles.cardCost}>${item.acquisitionPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
            <View style={styles.cardActions}>
              <Pressable onPress={onMove} hitSlop={8}>
                <Ionicons name="swap-horizontal" size={20} color={c.textSecondary} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={c.error} />
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
    height: 140,
    backgroundColor: c.surfaceHighlight,
  },
  cardImagePlaceholder: {
    width: 100,
    height: 140,
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
});
