import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { getMarketProducts, getMarketSets } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { MarketProduct, MarketSet } from '@/lib/types';
import MarketProductDetail from '@/components/pricing/MarketProductDetail';

const c = Colors.dark;

const PRODUCT_TYPES = [
  { key: 'all', label: 'All Types' },
  { key: 'SINGLE_CARD', label: 'Singles' },
  { key: 'SEALED_PACK', label: 'Packs' },
  { key: 'SEALED_BOX', label: 'Boxes' },
];

const PAGE_SIZE = 25;

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [onlyInInventory, setOnlyInInventory] = useState(false);
  const [showSetFilter, setShowSetFilter] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: setsData } = useQuery({
    queryKey: ['marketSets'],
    queryFn: getMarketSets,
  });

  const {
    data: productsData,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['marketProducts', debouncedSearch, selectedSet, selectedType, onlyInInventory],
    queryFn: ({ pageParam = 1 }) => getMarketProducts({
      page: pageParam,
      limit: PAGE_SIZE,
      search: debouncedSearch,
      setExternalId: selectedSet === 'all' ? undefined : selectedSet,
      productType: selectedType === 'all' ? undefined : selectedType,
      onlyInInventory,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / PAGE_SIZE);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
  });

  const products = useMemo(() => {
    return productsData?.pages.flatMap(page => page.items) || [];
  }, [productsData]);

  const renderCard = useCallback(({ item }: { item: MarketProduct }) => (
    <Pressable onPress={() => { setSelectedProduct(item); setModalVisible(true); }}>
      <PricingRow card={item} />
    </Pressable>
  ), []);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={c.accent} size="small" />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>SlabHub</Text>
        <Text style={styles.title}>Market Pricing</Text>
        <Text style={styles.subtitle}>Reference prices for TCG collectibles</Text>
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

      <View style={styles.filtersRow}>
        <Pressable
          style={[styles.filterBtn, showSetFilter && styles.filterBtnActive]}
          onPress={() => setShowSetFilter(!showSetFilter)}
        >
          <Ionicons name="albums-outline" size={16} color={showSetFilter ? c.accent : c.textSecondary} />
          <Text style={[styles.filterBtnText, showSetFilter && { color: c.accent }]}>
            {selectedSet === 'all'
              ? 'All Sets'
              : (setsData?.find(s => s.externalId === selectedSet)?.code || selectedSet)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={showSetFilter ? c.accent : c.textSecondary} />
        </Pressable>

        <FlatList
          horizontal
          data={PRODUCT_TYPES}
          renderItem={({ item: filter }) => (
            <Pressable
              style={[styles.typeChip, selectedType === filter.key && styles.typeChipActive]}
              onPress={() => setSelectedType(filter.key)}
            >
              <Text style={[styles.typeChipText, selectedType === filter.key && styles.typeChipTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          )}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        />
      </View>

      {showSetFilter && (
        <View style={styles.setFilterContainer}>
          <FlatList
            horizontal
            data={[
              { externalId: 'all', name: 'All Sets' } as MarketSet,
              ...(setsData?.filter(s => !!s.code) || [])
            ]}
            renderItem={({ item: set }) => (
              <Pressable
                style={[styles.setChip, selectedSet === set.externalId && styles.setChipActive]}
                onPress={() => { setSelectedSet(set.externalId); setShowSetFilter(false); }}
              >
                <Text style={[styles.setChipText, selectedSet === set.externalId && { color: c.accent }]}>
                  {set.externalId === 'all' ? 'All' : (set.code || set.externalId.split('-').pop())}
                </Text>
                <Text style={styles.setChipName} numberOfLines={1}>{set.name}</Text>
              </Pressable>
            )}
            keyExtractor={(item) => item.externalId}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setChipsContent}
          />
        </View>
      )}

      <View style={styles.inventoryToggleRow}>
        <View style={styles.toggleTextCol}>
          <Text style={styles.toggleLabel}>In My Inventory Only</Text>
          <Text style={styles.toggleSub}>Show prices for items you own</Text>
        </View>
        <Switch
          value={onlyInInventory}
          onValueChange={setOnlyInInventory}
          trackColor={{ false: c.surfaceHighlight, true: c.accent }}
          thumbColor={Platform.OS === 'ios' ? '#fff' : onlyInInventory ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Item</Text>
        <Text style={[styles.tableHeaderText, { width: 90, textAlign: 'right' }]}>Market Prices</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={c.accent} size="large" />
          <Text style={styles.loadingText}>Loading pricing data...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={c.textTertiary} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
            </View>
          }
          refreshing={isFetching && !isLoading && !isFetchingNextPage}
          onRefresh={refetch}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
        onDismiss={() => setSelectedProduct(null)}
      >
        <MarketProductDetail
          product={selectedProduct}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
    </View>
  );
}

function PricingRow({ card }: { card: MarketProduct }) {
  const gradedPrices = [
    { label: "10", price: card.grade10Price },
    { label: "9.5", price: card.grade95Price },
    { label: "9", price: card.grade9Price },
    { label: "8", price: card.grade8Price },
    { label: "7", price: card.grade7Price },
  ].filter(g => g.price && g.price > 0);

  return (
    <View style={styles.pricingRow}>
      <View style={styles.pricingImageContainer}>
        {card.imageUrl ? (
          <Image source={{ uri: getOptimizedImageUrl(card.imageUrl, { height: 200 }) }} style={styles.pricingImage} contentFit="cover" />
        ) : (
          <View style={styles.pricingImagePlaceholder}>
            <Ionicons name="image-outline" size={16} color={c.textTertiary} />
          </View>
        )}
      </View>
      <View style={styles.pricingInfo}>
        <Text style={styles.pricingName} numberOfLines={2}>{card.name}</Text>
        <View style={styles.pricingMeta}>
          <Text style={styles.pricingId}>{card.number}</Text>
          <View style={styles.pricingTypeBadge}>
            <Text style={styles.pricingTypeText}>
              {card.productType?.replace('SEALED_', '') || 'SINGLE'}
            </Text>
          </View>
          <Text style={styles.pricingSet} numberOfLines={1}>{card.set}</Text>
        </View>

      </View>
      <View style={styles.pricingPriceCol}>
        <View style={styles.mainPriceRow}>
          <Text style={styles.pricingPrice}>
            ${card.rawPrice ? Math.round(card.rawPrice).toLocaleString() : '-'}
          </Text>
          <Text style={styles.rawLabel}>RAW</Text>
        </View>

        {gradedPrices.length > 0 && (
          <View style={styles.badgeRow}>
            {gradedPrices.map((g) => (
              <View key={g.label} style={styles.gradedBadge}>
                <Text style={styles.gradedLabel}>{g.label}</Text>
                <Text style={styles.gradedPrice}>${Math.round(g.price!).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
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
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 8,
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
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  filterBtnActive: {
    borderColor: c.accent,
  },
  filterBtnText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  typeChipActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  typeChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  typeChipTextActive: {
    color: c.accent,
  },
  setFilterContainer: {
    marginBottom: 8,
  },
  setChipsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  setChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    minWidth: 60,
  },
  setChipActive: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  setChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: c.text,
  },
  setChipName: {
    fontSize: 10,
    color: c.textTertiary,
    marginTop: 2,
    maxWidth: 80,
  },
  inventoryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: c.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  toggleSub: {
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  tableHeaderText: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  pricingImageContainer: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: c.surface,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  pricingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pricingImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingInfo: {
    flex: 1,
    marginRight: 12,
  },
  pricingName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.text,
    lineHeight: 20,
  },
  pricingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pricingId: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: c.textTertiary,
  },
  pricingTypeBadge: {
    backgroundColor: c.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pricingTypeText: {
    fontSize: 9,
    color: c.textSecondary,
    fontWeight: '600' as const,
  },
  pricingSet: {
    fontSize: 11,
    color: c.textTertiary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  gradedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: c.surfaceHighlight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: c.borderLight,
  },
  gradedLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: c.textTertiary,
  },
  gradedPrice: {
    fontSize: 9,
    fontWeight: '600',
    color: c.text,
  },
  pricingPriceCol: {
    alignItems: 'flex-end',
    minWidth: 100,
    justifyContent: 'center',
  },
  mainPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pricingPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: c.text,
  },
  rawLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: c.textTertiary,
    textTransform: 'uppercase',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
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
