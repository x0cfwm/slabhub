import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { VendorShopView } from '@/app/vendor/[handle]';
import Colors from '@/constants/colors';

const c = Colors.dark;

export default function ShopScreen() {
  const { profile } = useApp();

  if (!profile.handle) {
    return <ShopSetupEmptyState />;
  }

  return <VendorShopView handle={profile.handle} hideBackButton />;
}

function ShopSetupEmptyState() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SlabHub</Text>
          <Text style={styles.title}>Shop</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.push('/recent-shops' as any)}
          accessibilityLabel="Recent shops"
        >
          <Ionicons name="time-outline" size={20} color={c.accent} />
        </Pressable>
      </View>
      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={48} color={c.textTertiary} />
        <Text style={styles.emptyTitle}>Set Up Your Shop</Text>
        <Text style={styles.emptySubtitle}>
          Configure your shop name, handle, and payment methods to start selling.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push('/shop-settings' as any)}
        >
          <Text style={styles.emptyBtnText}>Set Up Shop</Text>
        </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.accentText,
  },
});
