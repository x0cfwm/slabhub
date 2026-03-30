import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
import ViewShot from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { SvgXml } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { generatePosting } from '@/lib/api';
import {
  type GeneratedPosting,
  type PostingBackground,
  type PostingPlatform,
  type PostingRatio,
  type PostingSelectionMode,
  type PostingTone,
} from '@/lib/types';
import {
  POSTING_PLATFORM_PRESETS,
  buildPostingPayload,
  decodeSvgDataUrl,
  filterPostingItems,
  getDefaultPostingStatusIds,
  getEligiblePostingStatuses,
  getPostingAspectRatio,
  getPostingItemSubtitle,
  getSelectedPostingItems,
  shouldBlockPostingScreen,
  withPostingBackground,
  withPostingRatio,
  withPostingTone,
} from '@/lib/posting';

const c = Colors.dark;

export default function PostingScreen() {
  const insets = useSafeAreaInsets();
  const {
    inventory,
    statuses,
    refreshInventory,
    refreshStatuses,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PostingSelectionMode>('BY_STATUS');
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [platform, setPlatform] = useState<PostingPlatform>('INSTAGRAM');
  const [textOptions, setTextOptions] = useState(POSTING_PLATFORM_PRESETS.INSTAGRAM.textOptions);
  const [visualOptions, setVisualOptions] = useState(POSTING_PLATFORM_PRESETS.INSTAGRAM.visualOptions);
  const [generated, setGenerated] = useState<GeneratedPosting | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const previewRef = useRef<ViewShot>(null);

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
  const currentImage = generated?.imageDataUrl[currentImageIndex];
  const currentSvgXml = currentImage ? decodeSvgDataUrl(currentImage) : null;
  const showBlockingLoader = shouldBlockPostingScreen({
    isRefreshing,
    inventoryCount: inventory.length,
    statusCount: statuses.length,
  });
  const previewAspectRatio = getPostingAspectRatio(
    generated?.visualOptions.ratio ?? visualOptions.ratio,
  );

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

      setGenerated(response);
      setCurrentImageIndex(0);
    } catch (error: any) {
      Alert.alert('Generation failed', error?.message || 'Failed to generate post content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const capturePreview = async () => {
    if (!previewRef.current?.capture) {
      throw new Error('Preview is not ready yet.');
    }

    return previewRef.current.capture();
  };

  const handleShareImage = async () => {
    if (!generated || !currentSvgXml) return;

    try {
      const imageUri = await capturePreview();

      if (Platform.OS === 'web') {
        Alert.alert('Unavailable on web', 'Image sharing is only available in the native mobile app.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing unavailable', 'This device does not support the native share sheet.');
        return;
      }

      await Sharing.shareAsync(imageUri, {
        dialogTitle: 'Share or save your post image',
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
      });
    } catch (error: any) {
      Alert.alert('Share failed', error?.message || 'Failed to export the current image.');
    }
  };

  const handleCopyCaption = async () => {
    if (!generated?.caption) return;
    await Clipboard.setStringAsync(generated.caption);
    Alert.alert('Caption copied', 'The generated caption is now in your clipboard.');
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
            onPress={() => {
              if (generated) {
                setGenerated(null);
                setCurrentImageIndex(0);
                return;
              }

              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </Pressable>
          <View>
            <Text style={styles.brand}>SlabHub</Text>
            <Text style={styles.title}>{generated ? 'Review & Share' : 'Create Post'}</Text>
          </View>
        </View>
      </View>

      {generated ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ready to post</Text>
            <Text style={styles.summaryText}>
              {generated.itemCount} item{generated.itemCount === 1 ? '' : 's'} in this bundle.
            </Text>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Visual Preview</Text>
              {generated.imageDataUrl.length > 1 && (
                <Text style={styles.previewMeta}>
                  {currentImageIndex + 1} / {generated.imageDataUrl.length}
                </Text>
              )}
            </View>

            <ViewShot
              ref={previewRef}
              style={styles.previewCaptureArea}
              options={{ format: 'jpg', quality: 0.92, result: 'tmpfile' }}
            >
              <View style={[styles.previewFrame, { aspectRatio: previewAspectRatio }]}>
                {currentSvgXml ? (
                  <SvgXml xml={currentSvgXml} width="100%" height="100%" />
                ) : (
                  <View style={styles.emptyPreview}>
                    <Text style={styles.emptyPreviewText}>Preview unavailable</Text>
                  </View>
                )}
              </View>
            </ViewShot>

            {generated.imageDataUrl.length > 1 && (
              <View style={styles.previewControls}>
                <Pressable
                  style={({ pressed }) => [
                    styles.previewNavBtn,
                    currentImageIndex === 0 && styles.previewNavBtnDisabled,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => setCurrentImageIndex((value) => Math.max(0, value - 1))}
                  disabled={currentImageIndex === 0}
                >
                  <Ionicons name="chevron-back" size={18} color={c.text} />
                  <Text style={styles.previewNavText}>Prev</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.previewNavBtn,
                    currentImageIndex === generated.imageDataUrl.length - 1 && styles.previewNavBtnDisabled,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() =>
                    setCurrentImageIndex((value) =>
                      Math.min(generated.imageDataUrl.length - 1, value + 1),
                    )
                  }
                  disabled={currentImageIndex === generated.imageDataUrl.length - 1}
                >
                  <Text style={styles.previewNavText}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color={c.text} />
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Caption</Text>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                onPress={handleCopyCaption}
              >
                <Ionicons name="copy-outline" size={18} color={c.accent} />
              </Pressable>
            </View>
            <Text style={styles.captionText}>{generated.caption}</Text>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.sectionTitle}>Included Items</Text>
            <View style={styles.includedList}>
              {generated.items.map((item) => (
                <View key={item.id} style={styles.includedRow}>
                  <View style={styles.includedBullet} />
                  <View style={styles.includedCopy}>
                    <Text style={styles.includedTitle}>{item.title}</Text>
                    <Text style={styles.includedSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {isRefreshing ? (
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

          <View style={styles.composeCard}>
            <Text style={styles.sectionTitle}>Preset</Text>
            <View style={styles.presetList}>
              {(Object.keys(POSTING_PLATFORM_PRESETS) as PostingPlatform[]).map((presetKey) => {
                const preset = POSTING_PLATFORM_PRESETS[presetKey];
                const isActive = platform === presetKey;

                return (
                  <Pressable
                    key={presetKey}
                    style={[styles.presetCard, isActive && styles.presetCardActive]}
                    onPress={() => handleApplyPlatform(presetKey)}
                  >
                    <View style={styles.presetHeader}>
                      <Text style={[styles.presetTitle, isActive && styles.presetTitleActive]}>
                        {preset.label}
                      </Text>
                      {isActive && <Ionicons name="checkmark-circle" size={18} color={c.accent} />}
                    </View>
                    <Text style={styles.presetDescription}>{preset.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricLabel}>Selected</Text>
              <Text style={styles.summaryMetricValue}>
                {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricLabel}>Preset</Text>
              <Text style={styles.summaryMetricValue}>{currentPreset.label}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.advancedBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setOptionsVisible(true)}
          >
            <View>
              <Text style={styles.advancedTitle}>More options</Text>
              <Text style={styles.advancedSubtitle}>
                Tone, ratio, background, and caption toggles.
              </Text>
            </View>
            <Ionicons name="options-outline" size={20} color={c.accent} />
          </Pressable>
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        {generated ? (
          <View style={styles.footerActions}>
            <Pressable
              style={({ pressed }) => [styles.secondaryActionBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={handleCopyCaption}
            >
              <Ionicons name="copy-outline" size={18} color={c.text} />
              <Text style={styles.secondaryActionText}>Copy Caption</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={handleShareImage}
            >
              <Ionicons name="share-social-outline" size={18} color={c.accentText} />
              <Text style={styles.primaryActionText}>Share / Save</Text>
            </Pressable>
          </View>
        ) : (
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
        )}
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
    justifyContent: 'space-between',
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
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 16,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
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
  presetList: {
    gap: 10,
  },
  presetCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceHighlight,
    padding: 14,
    gap: 6,
  },
  presetCardActive: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
  },
  presetTitleActive: {
    color: c.accent,
  },
  presetDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
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
  advancedBtn: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  advancedSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: 16,
    gap: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewMeta: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600',
  },
  previewCaptureArea: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  previewFrame: {
    width: '100%',
    backgroundColor: '#0b1120',
    borderRadius: 18,
    overflow: 'hidden',
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceHighlight,
  },
  emptyPreviewText: {
    color: c.textSecondary,
    fontSize: 14,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.surfaceHighlight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingVertical: 10,
  },
  previewNavBtnDisabled: {
    opacity: 0.45,
  },
  previewNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.text,
  },
  includedList: {
    gap: 12,
  },
  includedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  includedBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
    marginTop: 8,
  },
  includedCopy: {
    flex: 1,
    gap: 3,
  },
  includedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  includedSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
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
  footerActions: {
    flexDirection: 'row',
    gap: 12,
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
  secondaryActionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
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
