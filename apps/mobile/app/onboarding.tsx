import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  Pressable,
  Platform,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import OnboardingPage from '@/components/onboarding/OnboardingPage';
import PaginationDots from '@/components/onboarding/PaginationDots';

const ONBOARDING_KEY = '@slabhub_onboarding_completed';
const c = Colors.dark;
const PAGE_COUNT = 5;

const PAGES = [
  {
    id: '0',
    badge: 'The #1 TCG Collector CRM',
    title: 'Welcome to\nSlabHub',
    subtitle: 'A collectible inventory management system built by collectors for collectors and vendors.',
    iconContent: 'logo',
  },
  {
    id: '1',
    badge: 'Inventory',
    title: 'Track Everything\nIn One Place',
    subtitle: 'Track everything about your inventory in one place \u2014 grading status, cost, market price.',
    iconContent: 'inventory',
  },
  {
    id: '2',
    badge: 'Analytics',
    title: 'Clarity On\nYour P&L',
    subtitle: 'Absolute clarity on your P&L \u2014 see profit or growth on every item you\u2019ve acquired or sold.',
    iconContent: 'analytics',
  },
  {
    id: '3',
    badge: 'Public Shop Page',
    title: 'Share Your\nShop Instantly',
    subtitle: 'Share your public shop page with items you want to list or specific items in socials in 1 click.',
    iconContent: 'shop',
  },
  {
    id: '4',
    badge: "Let's Go",
    title: 'Ready to\nGet Started?',
    subtitle: 'Save time on listing, sharing, managing and tracking your collectible dreams!',
    iconContent: 'start',
  },
];

function PageIcon({ type }: { type: string }) {
  switch (type) {
    case 'logo':
      return (
        <View style={iconStyles.container}>
          <MaterialCommunityIcons name="cards-playing-outline" size={56} color={c.accent} />
          <View style={iconStyles.accentRing} />
        </View>
      );
    case 'inventory':
      return (
        <View style={iconStyles.container}>
          <View style={iconStyles.pipelineRow}>
            <View style={[iconStyles.stageDot, { backgroundColor: c.acquired }]} />
            <View style={[iconStyles.stageConnector, { backgroundColor: c.acquired + '40' }]} />
            <View style={[iconStyles.stageDot, { backgroundColor: c.inTransit }]} />
            <View style={[iconStyles.stageConnector, { backgroundColor: c.inTransit + '40' }]} />
            <View style={[iconStyles.stageDot, { backgroundColor: c.grading }]} />
          </View>
          <View style={iconStyles.pipelineRow}>
            <View style={[iconStyles.stageDot, { backgroundColor: c.inStock }]} />
            <View style={[iconStyles.stageConnector, { backgroundColor: c.inStock + '40' }]} />
            <View style={[iconStyles.stageDot, { backgroundColor: c.listed }]} />
            <View style={[iconStyles.stageConnector, { backgroundColor: c.listed + '40' }]} />
            <View style={[iconStyles.stageDot, { backgroundColor: c.sold }]} />
          </View>
          <Ionicons name="layers" size={32} color={c.accent} style={{ marginTop: 4 }} />
        </View>
      );
    case 'analytics':
      return (
        <View style={iconStyles.container}>
          <View style={iconStyles.chartBars}>
            <View style={[iconStyles.chartBar, { height: 28, backgroundColor: c.textTertiary }]} />
            <View style={[iconStyles.chartBar, { height: 48, backgroundColor: c.accent + '80' }]} />
            <View style={[iconStyles.chartBar, { height: 64, backgroundColor: c.accent }]} />
            <View style={[iconStyles.chartBar, { height: 40, backgroundColor: c.accent + '80' }]} />
            <View style={[iconStyles.chartBar, { height: 56, backgroundColor: c.accent }]} />
          </View>
          <Feather name="trending-up" size={28} color={c.success} style={{ marginTop: 8 }} />
        </View>
      );
    case 'shop':
      return (
        <View style={iconStyles.container}>
          <View style={iconStyles.shopCard}>
            <Ionicons name="storefront-outline" size={28} color={c.accent} />
            <View style={iconStyles.shopDivider} />
            <View style={iconStyles.shopItems}>
              <View style={[iconStyles.shopItem, { backgroundColor: c.accent + '30' }]} />
              <View style={[iconStyles.shopItem, { backgroundColor: c.accent + '50' }]} />
              <View style={[iconStyles.shopItem, { backgroundColor: c.accent + '30' }]} />
            </View>
          </View>
          <Ionicons name="share-outline" size={24} color={c.textSecondary} style={{ marginTop: 4 }} />
        </View>
      );
    case 'start':
      return (
        <View style={iconStyles.container}>
          <View style={iconStyles.startCircle}>
            <Ionicons name="rocket" size={40} color={c.accent} />
          </View>
        </View>
      );
    default:
      return null;
  }
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNext = () => {
    if (activeIndex < PAGE_COUNT - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleGetStarted = async () => {
    if (completing) return;
    setCompleting(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login' as any);
  };

  const isLastPage = activeIndex === PAGE_COUNT - 1;

  const renderPage = ({ item }: { item: typeof PAGES[0] }) => (
    <OnboardingPage
      icon={<PageIcon type={item.iconContent} />}
      title={item.title}
      subtitle={item.subtitle}
      badge={item.badge}
    />
  );

  const buttonOpacity = scrollX.interpolate({
    inputRange: [(PAGE_COUNT - 2) * screenWidth, (PAGE_COUNT - 1) * screenWidth],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const continueOpacity = scrollX.interpolate({
    inputRange: [(PAGE_COUNT - 2) * screenWidth, (PAGE_COUNT - 1) * screenWidth],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.skipRow}>
        {!isLastPage ? (
          <Pressable
            style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleGetStarted}
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(item) => item.id}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, webBottomInset) + 20 }]}>
        <PaginationDots
          count={PAGE_COUNT}
          scrollX={scrollX}
          pageWidth={screenWidth}
        />

        <View style={styles.ctaContainer}>
          <Animated.View style={[styles.ctaAnimated, { opacity: continueOpacity, position: isLastPage ? 'absolute' : 'relative' }]}>
            {!isLastPage && (
              <Pressable
                style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={goToNext}
              >
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={c.accentText} />
              </Pressable>
            )}
          </Animated.View>

          {isLastPage && (
            <Animated.View style={[styles.ctaAnimated, { opacity: buttonOpacity }]}>
              <Pressable
                style={({ pressed }) => [styles.getStartedBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleGetStarted}
              >
                <Text style={styles.getStartedBtnText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color={c.accentText} />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  accentRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: c.accent + '20',
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageConnector: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  chartBar: {
    width: 14,
    borderRadius: 4,
  },
  shopCard: {
    width: 100,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  shopDivider: {
    width: '100%',
    height: 1,
    backgroundColor: c.border,
  },
  shopItems: {
    flexDirection: 'row',
    gap: 6,
  },
  shopItem: {
    width: 22,
    height: 30,
    borderRadius: 4,
  },
  startCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.accent + '30',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 44,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: c.textSecondary,
  },
  bottomArea: {
    paddingHorizontal: 20,
    gap: 28,
  },
  ctaContainer: {
    minHeight: 56,
    alignItems: 'center',
  },
  ctaAnimated: {
    width: '100%',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: c.accentText,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  getStartedBtnText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: c.accentText,
  },
});
