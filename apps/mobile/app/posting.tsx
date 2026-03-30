import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { generatePosting } from '@/lib/api';
import {
  type PostingBackground,
  type PostingPlatform,
  type PostingRatio,
  type PostingSelectionMode,
  type PostingTone,
} from '@/lib/types';
import {
  POSTING_PLATFORM_PRESETS,
  buildPostingPayload,
  filterPostingItems,
  getDefaultPostingStatusIds,
  getEligiblePostingStatuses,
  getPostingItemSubtitle,
  getSelectedPostingItems,
  shouldBlockPostingScreen,
  shouldShowPostingRefreshNotice,
  withPostingBackground,
  withPostingRatio,
  withPostingTone,
} from '@/lib/posting';
import { setPostingReviewSession } from '@/lib/posting-review-session';

const c = Colors.dark;
const REFRESH_NOTICE_DELAY_MS = 2000;

export default function PostingScreen() {
  const insets = useSafeAreaInsets();
  const { inventory, statuses, refreshInventory, refreshStatuses } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PostingSelectionMode>('BY_STATUS');
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [platform, setPlatform] = useState<PostingPlatform>('INSTAGRAM');
  const [textOptions, setTextOptions] = useState(POSTING_PLATFORM_PRESETS.INSTAGRAM.textOptions);
  const [visualOptions, setVisualOptions] = useState(POSTING_PLATFORM_PRESETS.INSTAGRAM.visualOptions);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [refreshNoticeDelayElapsed, setRefreshNoticeDelayElapsed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsRefreshing(true);
      try {
        await Promise.allSettled([refreshInventory(), refreshStatuses()]);
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [refreshInventory, refreshStatuses]);

  useEffect(() => {
    if (!isRefreshing) {
      setRefreshNoticeDelayElapsed(false);
      return;
    }

    setRefreshNoticeDelayElapsed(false);
    const timeoutId = setTimeout(() => {
      setRefreshNoticeDelayElapsed(true);
    }, REFRESH_NOTICE_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isRefreshing]);

  const eligibleStatuses = useMemo(
    () => getEligiblePostingStatuses(statuses, inventory),
    [statuses, inventory],
  );

  const visibleManualItems = useMemo(
    () => filterPostingItems(inventory, itemSearch),
    [inventory, itemSearch],
  );

  const selectedItems = useMemo(
    () =>
      getSelectedPostingItems({
        items: inventory,
        selectionMode,
        selectedStatusIds,
        selectedItemIds,
      }),
    [inventory, selectionMode, selectedStatusIds, selectedItemIds],
  );

  useEffect(() => {
    if (selectionMode !== 'BY_STATUS') return;

    const allowed = new Set(eligibleStatuses.map((status) => status.id));
    setSelectedStatusIds((current) => {
      const next = current.filter((id) => allowed.has(id));
      if (next.length > 0) return next;
      return getDefaultPostingStatusIds(statuses, inventory);
    });
  }, [selectionMode, eligibleStatuses, statuses, inventory]);

  const currentPreset = POSTING_PLATFORM_PRESETS[platform];
  const showBlockingLoader = shouldBlockPostingScreen({
    isRefreshing,
    inventoryCount: inventory.length,
    statusCount: statuses.length,
  });
  const showInlineRefreshNotice = shouldShowPostingRefreshNotice({
    isRefreshing,
    delayElapsed: refreshNoticeDelayElapsed,
  });

  const handleApplyPlatform = (nextPlatform: PostingPlatform) => {
    setPlatform(nextPlatform);
    setTextOptions(POSTING_PLATFORM_PRESETS[nextPlatform].textOptions);
    setVisualOptions(POSTING_PLATFORM_PRESETS[nextPlatform].visualOptions);
  };

  const toggleStatus = (statusId: string) => {
    setSelectedStatusIds((current) =>
      current.includes(statusId)
        ? current.filter((id) => id !== statusId)
        : [...current, statusId],
    );
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
  };

  const handleGenerate = async () => {
    if (selectionMode === 'BY_STATUS' && selectedStatusIds.length === 0) {
      Alert.alert('Select a status', 'Choose at least one status to generate a post.');
      return;
    }

    if (selectionMode === 'MANUAL' && selectedItemIds.length === 0) {
      Alert.alert('Select items', 'Choose at least one inventory item to generate a post.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generatePosting(
        buildPostingPayload({
          selectionMode,
          selectedStatusIds,
          selectedItemIds,
          textOptions,
          visualOptions,
        }),
      );

      setPostingReviewSession(response);
      router.push('/posting-review' as any);
    } catch (error: any) {
      Alert.alert('Generation failed', error?.message || 'Failed to generate post content.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (showBlockingLoader) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={c.accent} />
        <Text style={styles.loadingText}>Loading posting builder...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </Pressable>
          <View>
            <Text style={styles.brand}>SlabHub</Text>
            <Text style={styles.title}>Create Post</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="sparkles" size={22} color={c.accent} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Fast posting for Facebook and Instagram</Text>
            <Text style={styles.infoText}>
              Generate a ready-to-share caption and visual bundle from your inventory in just a few taps.
            </Text>
          </View>
        </View>

        {showInlineRefreshNotice ? (
          <View style={styles.inlineRefreshNotice}>
            <ActivityIndicator size="small" color={c.accent} />
            <Text style={styles.inlineRefreshText}>Syncing latest inventory...</Text>
          </View>
        ) : null}

        <View style={styles.composeCard}>
          <Text style={styles.sectionTitle}>Selection Mode</Text>
          <View style={styles.segmentedControl}>
            {(['BY_STATUS', 'MANUAL'] as PostingSelectionMode[]).map((value) => {
              const isActive = selectionMode === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => setSelectionMode(value)}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {value === 'BY_STATUS' ? 'By Status' : 'Manual'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectionMode === 'BY_STATUS' ? (
            <View style={styles.statusChipList}>
              {eligibleStatuses.length > 0 ? (
                eligibleStatuses.map((status) => {
                  const isSelected = selectedStatusIds.includes(status.id);
                  const statusColor = status.color || c.accent;

                  return (
                    <Pressable
                      key={status.id}
                      style={[
                        styles.statusChip,
                        isSelected && styles.statusChipActive,
                        isSelected && { borderColor: statusColor },
                      ]}
                      onPress={() => toggleStatus(status.id)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                        {status.name}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.emptySelectionText}>No eligible statuses with items.</Text>
              )}
            </View>
          ) : (
            <View style={styles.manualSection}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={c.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search inventory..."
                  placeholderTextColor={c.textTertiary}
                  value={itemSearch}
                  onChangeText={setItemSearch}
                />
                {itemSearch.length > 0 && (
                  <Pressable onPress={() => setItemSearch('')}>
                    <Ionicons name="close-circle" size={18} color={c.textTertiary} />
                  </Pressable>
                )}
              </View>

              <View style={styles.manualList}>
                {visibleManualItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.manualRow, isSelected && styles.manualRowActive]}
                      onPress={() => toggleItem(item.id)}
                    >
                      {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={styles.manualThumb} contentFit="cover" />
                      ) : (
                        <View style={styles.manualThumbPlaceholder}>
                          <Ionicons name="image-outline" size={18} color={c.textTertiary} />
                        </View>
                      )}

                      <View style={styles.manualCopy}>
                        <Text style={styles.manualTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.manualSubtitle} numberOfLines={1}>
                          {getPostingItemSubtitle(item)}
                        </Text>
                      </View>

                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? c.accent : c.textTertiary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>Selected</Text>
            <Text style={styles.summaryMetricValue}>
              {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>Format</Text>
            <Text style={styles.summaryMetricValue}>{visualOptions.ratio}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.presetSummaryCard, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => setOptionsVisible(true)}
        >
          <View style={styles.presetSummaryCopy}>
            <Text style={styles.presetSummaryLabel}>Preset</Text>
            <Text style={styles.presetSummaryValue}>{currentPreset.label}</Text>
          </View>
          <View style={styles.presetSummaryAction}>
            <Text style={styles.presetSummaryActionText}>More Options</Text>
            <Ionicons name="options-outline" size={16} color={c.accent} />
          </View>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryActionBtn,
            (isGenerating || selectedItems.length === 0) && styles.primaryActionBtnDisabled,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={isGenerating || selectedItems.length === 0}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={c.accentText} />
          ) : (
            <Ionicons name="sparkles" size={18} color={c.accentText} />
          )}
          <Text style={styles.primaryActionText}>
            {isGenerating ? 'Generating...' : 'Generate Post'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={optionsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>More Options</Text>
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setOptionsVisible(false)}
            >
              <Ionicons name="close" size={18} color={c.accent} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Preset</Text>
              <View style={styles.optionChipRow}>
                {(Object.keys(POSTING_PLATFORM_PRESETS) as PostingPlatform[]).map((presetKey) => {
                  const isActive = platform === presetKey;
                  return (
                    <Pressable
                      key={presetKey}
                      style={[styles.optionChip, isActive && styles.optionChipActive]}
                      onPress={() => handleApplyPlatform(presetKey)}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {POSTING_PLATFORM_PRESETS[presetKey].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tone</Text>
              <View style={styles.optionChipRow}>
                {(['HYPE', 'PROFESSIONAL', 'CONCISE'] as PostingTone[]).map((tone) => {
                  const isActive = textOptions.tone === tone;
                  return (
                    <Pressable
                      key={tone}
                      style={[styles.optionChip, isActive && styles.optionChipActive]}
                      onPress={() => setTextOptions((current) => withPostingTone(current, tone))}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {tone === 'HYPE'
                          ? 'Hype'
                          : tone === 'PROFESSIONAL'
                            ? 'Professional'
                            : 'Concise'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Ratio</Text>
              <View style={styles.optionChipRow}>
                {(['1:1', '4:5', '9:16'] as PostingRatio[]).map((ratio) => {
                  const isActive = visualOptions.ratio === ratio;
                  return (
                    <Pressable
                      key={ratio}
                      style={[styles.optionChip, isActive && styles.optionChipActive]}
                      onPress={() => setVisualOptions((current) => withPostingRatio(current, ratio))}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {ratio}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Background</Text>
              <View style={styles.optionChipRow}>
                {(['DARK', 'LIGHT', 'SUNSET'] as PostingBackground[]).map((background) => {
                  const isActive = visualOptions.backgroundStyle === background;
                  return (
                    <Pressable
                      key={background}
                      style={[styles.optionChip, isActive && styles.optionChipActive]}
                      onPress={() =>
                        setVisualOptions((current) => withPostingBackground(current, background))
                      }
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {background === 'DARK'
                          ? 'Dark'
                          : background === 'LIGHT'
                            ? 'Light'
                            : 'Sunset'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Caption</Text>
              <ToggleRow
                label="Include price"
                value={textOptions.includePrice ?? true}
                onValueChange={(value) => setTextOptions((current) => ({ ...current, includePrice: value }))}
              />
              <ToggleRow
                label="Include grade"
                value={textOptions.includeGrade ?? true}
                onValueChange={(value) => setTextOptions((current) => ({ ...current, includeGrade: value }))}
              />
              <ToggleRow
                label="Include hashtags"
                value={textOptions.includeHashtags ?? true}
                onValueChange={(value) => setTextOptions((current) => ({ ...current, includeHashtags: value }))}
              />
              <ToggleRow
                label="Include CTA"
                value={textOptions.includeCta ?? true}
                onValueChange={(value) => setTextOptions((current) => ({ ...current, includeCta: value }))}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Visual</Text>
              <ToggleRow
                label="Show price badge"
                value={visualOptions.showPriceBadge ?? true}
                onValueChange={(value) =>
                  setVisualOptions((current) => ({ ...current, showPriceBadge: value }))
                }
              />
              <ToggleRow
                label="Show watermark"
                value={visualOptions.showWatermark ?? true}
                onValueChange={(value) =>
                  setVisualOptions((current) => ({ ...current, showWatermark: value }))
                }
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.surfaceHighlight, true: c.accent }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: c.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: c.text,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 18,
  },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  inlineRefreshNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineRefreshText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  composeCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: c.surfaceHighlight,
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  segment: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: c.accent,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
  segmentTextActive: {
    color: c.accentText,
  },
  statusChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceHighlight,
  },
  statusChipActive: {
    backgroundColor: c.accentDim,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  statusChipTextActive: {
    color: c.text,
  },
  emptySelectionText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  manualSection: {
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceHighlight,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: c.borderLight,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
  },
  manualList: {
    gap: 10,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  manualRowActive: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  manualThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: c.surface,
  },
  manualThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCopy: {
    flex: 1,
    gap: 4,
  },
  manualTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  manualSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
  },
  presetSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  presetSummaryCopy: {
    gap: 4,
    flex: 1,
  },
  presetSummaryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: c.textTertiary,
    fontWeight: '700',
  },
  presetSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
  },
  presetSummaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.surfaceHighlight,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  presetSummaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryMetric: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 14,
    gap: 4,
  },
  summaryMetricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: c.textTertiary,
    fontWeight: '600',
  },
  summaryMetricValue: {
    fontSize: 16,
    color: c.text,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.background,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryActionBtn: {
    backgroundColor: c.accent,
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  primaryActionBtnDisabled: {
    opacity: 0.5,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.accentText,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: c.text,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  modalSection: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 16,
    gap: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
  },
  optionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  optionChipActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  optionChipTextActive: {
    color: c.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    fontWeight: '500',
  },
});
