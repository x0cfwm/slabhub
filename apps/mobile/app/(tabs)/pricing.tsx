import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { PRICING_DATABASE, ONE_PIECE_SETS } from '@/constants/pricing-data';
import { PricingCard, TYPE_LABELS, ItemType } from '@/constants/types';

const c = Colors.dark;

const TYPE_FILTERS: { key: ItemType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Types' },
  { key: 'single_card', label: 'Singles' },
  { key: 'sealed_product', label: 'Sealed' },
];

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all');
  const [showSetFilter, setShowSetFilter] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredCards = useMemo(() => {
    return PRICING_DATABASE.filter((card) => {
      const matchesSearch = !searchQuery || card.name.toLowerCase().includes(searchQuery.toLowerCase()) || card.cardNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSet = selectedSet === 'all' || card.setCode === selectedSet;
      const matchesType = selectedType === 'all' || card.type === selectedType;
      return matchesSearch && matchesSet && matchesType;
    }).sort((a, b) => b.marketPrice - a.marketPrice);
  }, [searchQuery, selectedSet, selectedType]);

  const renderCard = useCallback(({ item }: { item: PricingCard }) => (
    <PricingRow card={item} />
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>SlabHub</Text>
        <Text style={styles.title}>Market Pricing</Text>
        <Text style={styles.subtitle}>One Piece TCG reference prices</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={c.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search card names..."
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
            {selectedSet === 'all' ? 'All Sets' : selectedSet}
          </Text>
          <Ionicons name="chevron-down" size={14} color={showSetFilter ? c.accent : c.textSecondary} />
        </Pressable>

        <FlatList
          horizontal
          data={TYPE_FILTERS}
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
        <FlatList
          horizontal
          data={[{ code: 'all', name: 'All Sets' }, ...ONE_PIECE_SETS]}
          renderItem={({ item: set }) => (
            <Pressable
              style={[styles.setChip, selectedSet === set.code && styles.setChipActive]}
              onPress={() => { setSelectedSet(set.code); setShowSetFilter(false); }}
            >
              <Text style={[styles.setChipText, selectedSet === set.code && { color: c.accent }]}>
                {set.code === 'all' ? 'All' : set.code}
              </Text>
              <Text style={styles.setChipName} numberOfLines={1}>{set.name}</Text>
            </Pressable>
          )}
          keyExtractor={(item) => item.code}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.setChipsContent}
          style={styles.setChipsContainer}
        />
      )}

      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Card</Text>
        <Text style={[styles.tableHeaderText, { width: 90, textAlign: 'right' }]}>Market Price</Text>
      </View>

      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredCards.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={c.textTertiary} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        }
      />
    </View>
  );
}

function PricingRow({ card }: { card: PricingCard }) {
  return (
    <View style={styles.pricingRow}>
      <View style={styles.pricingInfo}>
        <Text style={styles.pricingName} numberOfLines={1}>{card.name}</Text>
        <View style={styles.pricingMeta}>
          <Text style={styles.pricingId}>#{card.cardNumber}</Text>
          <View style={styles.pricingTypeBadge}>
            <Text style={styles.pricingTypeText}>
              {card.type === 'single_card' ? 'SINGLE' : card.type === 'sealed_product' ? 'SEALED' : 'GRADED'}
            </Text>
          </View>
          <Text style={styles.pricingRarity}>{card.rarity}</Text>
        </View>
      </View>
      <View style={styles.pricingPriceCol}>
        <Text style={styles.pricingPrice}>
          ${card.marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.pricingSubPrices}>
          {card.lastSoldEbay !== undefined && (
            <View style={[styles.subPriceBadge, { backgroundColor: '#0064D220' }]}>
              <Text style={[styles.subPriceText, { color: '#5BA3F5' }]}>
                ${card.lastSoldEbay.toFixed(2)}
              </Text>
            </View>
          )}
          {card.lastSoldTcgplayer !== undefined && (
            <View style={[styles.subPriceBadge, { backgroundColor: '#FF620020' }]}>
              <Text style={[styles.subPriceText, { color: '#FF9050' }]}>
                ${card.lastSoldTcgplayer.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
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
  setChipsContainer: {
    maxHeight: 60,
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
    fontSize: 12,
    color: c.textTertiary,
  },
  pricingTypeBadge: {
    backgroundColor: c.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pricingTypeText: {
    fontSize: 10,
    color: c.textSecondary,
    fontWeight: '600' as const,
  },
  pricingRarity: {
    fontSize: 12,
    color: c.textTertiary,
  },
  pricingPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pricingPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: c.text,
  },
  pricingSubPrices: {
    flexDirection: 'row',
    gap: 4,
  },
  subPriceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subPriceText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
