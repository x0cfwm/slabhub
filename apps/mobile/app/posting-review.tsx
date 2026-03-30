import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { SvgXml } from 'react-native-svg';
import Colors from '@/constants/colors';
import { decodeSvgDataUrl, getPostingAspectRatio } from '@/lib/posting';
import { getPostingReviewSession } from '@/lib/posting-review-session';

const c = Colors.dark;

export default function PostingReviewScreen() {
  const insets = useSafeAreaInsets();
  const previewRef = useRef<ViewShot>(null);
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

  const currentImage = generated.imageDataUrl[currentImageIndex];
  const currentSvgXml = currentImage ? decodeSvgDataUrl(currentImage) : null;
  const previewAspectRatio = getPostingAspectRatio(generated.visualOptions.ratio);

  const capturePreview = async () => {
    if (!previewRef.current?.capture) {
      throw new Error('Preview is not ready yet.');
    }

    return previewRef.current.capture();
  };

  const handleShareImage = async () => {
    if (!currentSvgXml) return;

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
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (error: any) {
      Alert.alert('Share failed', error?.message || 'Failed to export the current image.');
    }
  };

  const handleCopyCaption = async () => {
    if (!generated.caption) return;
    await Clipboard.setStringAsync(generated.caption);
    Alert.alert('Caption copied', 'The generated caption is now in your clipboard.');
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

          <ViewShot
            ref={previewRef}
            style={styles.previewCaptureArea}
            options={{ format: 'png', result: 'tmpfile' }}
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

      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
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
});
