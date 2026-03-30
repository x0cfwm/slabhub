import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { SvgXml } from 'react-native-svg';
import Colors from '@/constants/colors';
import {
  decodeSvgDataUrl,
  getPostingAspectRatio,
  getPostingBackgroundGradient,
  shouldUseDirectInstagramStoryShare,
} from '@/lib/posting';
import { getPostingReviewSession } from '@/lib/posting-review-session';

const c = Colors.dark;
const INSTAGRAM_STORY_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

export default function PostingReviewScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const previewRefs = useRef<Record<number, ViewShot | null>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const generated = getPostingReviewSession();

  useEffect(() => {
    if (!generated) {
      router.replace('/posting' as any);
    }
  }, [generated]);

  if (!generated) {
    return null;
  }

  const previewAspectRatio = getPostingAspectRatio(generated.visualOptions.ratio);
  const backgroundGradient = getPostingBackgroundGradient(
    generated.visualOptions.backgroundStyle ?? 'DARK',
  );
  const shouldShareDirectToStory = shouldUseDirectInstagramStoryShare({
    platform: generated.textOptions.platform,
    appId: INSTAGRAM_STORY_APP_ID,
  });
  const previewWidth = Math.max(screenWidth - 72, 240);

  const capturePreview = async () => {
    const activePreviewRef = previewRefs.current[currentImageIndex];
    if (!activePreviewRef?.capture) {
      throw new Error('Preview is not ready yet.');
    }

    return activePreviewRef.capture();
  };

  const handlePreviewMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
    setCurrentImageIndex(Math.max(0, Math.min(generated.imageDataUrl.length - 1, nextIndex)));
  };

  const handleShareImage = async () => {
    if (!generated.imageDataUrl[currentImageIndex]) return;

    if (Platform.OS === 'web') {
      Alert.alert('Unavailable on web', 'Image sharing is only available in the native mobile app.');
      return;
    }

    try {
      const imageUri = await capturePreview();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing unavailable', 'This device does not support the native share sheet.');
        return;
      }

      await Sharing.shareAsync(imageUri, {
        dialogTitle: 'Share or save your post image',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (error: any) {
      Alert.alert('Share failed', error?.message || 'Failed to export the current image.');
    }
  };

  const handleShareToInstagramStory = async () => {
    if (!generated.imageDataUrl[currentImageIndex] || !INSTAGRAM_STORY_APP_ID) return;

    if (Platform.OS === 'web') {
      Alert.alert('Unavailable on web', 'Instagram Story sharing is only available in the native mobile app.');
      return;
    }

    try {
      const imageUri = await capturePreview();
      const { default: Share, Social } = await import('react-native-share');

      await Share.shareSingle({
        social: Social.InstagramStories,
        appId: INSTAGRAM_STORY_APP_ID,
        stickerImage: imageUri,
        backgroundTopColor: backgroundGradient.top,
        backgroundBottomColor: backgroundGradient.bottom,
      });
    } catch (error: any) {
      Alert.alert('Instagram share failed', error?.message || 'Failed to open Instagram Story sharing.');
    }
  };

  const handleCopyCaption = async () => {
    if (!generated.caption) return;
    await Clipboard.setStringAsync(generated.caption);
    Alert.alert('Caption copied', 'The generated caption is now in your clipboard.');
  };

  const renderPreviewItem = ({ item, index }: { item: string; index: number }) => {
    const previewSvgXml = decodeSvgDataUrl(item);

    return (
      <View style={[styles.previewSlide, { width: previewWidth }]}>
        <ViewShot
          ref={(instance) => {
            previewRefs.current[index] = instance;
          }}
          style={styles.previewCaptureArea}
          options={{ format: 'png', result: 'tmpfile' }}
        >
          <View style={[styles.previewFrame, { aspectRatio: previewAspectRatio }]}>
            {previewSvgXml ? (
              <SvgXml xml={previewSvgXml} width="100%" height="100%" />
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyPreviewText}>Preview unavailable</Text>
              </View>
            )}
          </View>
        </ViewShot>
      </View>
    );
  };

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
            <Text style={styles.title}>Review & Share</Text>
          </View>
        </View>
      </View>

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

          <FlatList
            data={generated.imageDataUrl}
            keyExtractor={(_, index) => `posting-preview-${index}`}
            renderItem={renderPreviewItem}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePreviewMomentumEnd}
            scrollEnabled={generated.imageDataUrl.length > 1}
            getItemLayout={(_, index) => ({
              length: previewWidth,
              offset: previewWidth * index,
              index,
            })}
          />

          {generated.imageDataUrl.length > 1 && (
            <View style={styles.previewDots}>
              {generated.imageDataUrl.map((_, index) => (
                <View
                  key={`preview-dot-${index}`}
                  style={[
                    styles.previewDot,
                    index === currentImageIndex && styles.previewDotActive,
                  ]}
                />
              ))}
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

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.footerContent}>
          {shouldShareDirectToStory && (
            <Pressable
              style={({ pressed }) => [styles.instagramActionBtn, { opacity: pressed ? 0.92 : 1 }]}
              onPress={handleShareToInstagramStory}
            >
              <Ionicons name="logo-instagram" size={18} color={c.accentText} />
              <Text style={styles.primaryActionText}>Instagram Story</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.secondaryActionBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={handleShareImage}
          >
            <Ionicons name="share-outline" size={18} color={c.text} />
            <Text style={styles.secondaryActionText}>Share / Save</Text>
          </Pressable>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
  },
  previewMeta: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600',
  },
  previewCaptureArea: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  previewSlide: {
    alignSelf: 'center',
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
  previewDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: c.borderLight,
  },
  previewDotActive: {
    width: 24,
    backgroundColor: c.accent,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.text,
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
  footerContent: {
    gap: 12,
  },
  instagramActionBtn: {
    backgroundColor: c.accent,
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.accentText,
  },
  secondaryActionBtn: {
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
});
