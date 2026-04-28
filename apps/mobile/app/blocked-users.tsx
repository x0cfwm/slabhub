import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { BlockedUser, listBlockedUsers, unblockUser } from '@/lib/api';

const c = Colors.dark;

/**
 * Blocked users list — lets the user review and unblock vendors they have
 * previously blocked. Required for Apple App Store UGC guidelines (1.2).
 */
export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: blocked, isLoading } = useQuery({
    queryKey: ['moderation', 'blocks'],
    queryFn: listBlockedUsers,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: (_res, userId) => {
      queryClient.setQueryData<BlockedUser[]>(['moderation', 'blocks'], (prev) =>
        prev ? prev.filter((b) => b.userId !== userId) : prev,
      );
      // Vendor storefront might become visible again
      queryClient.invalidateQueries({ queryKey: ['vendor-page'] });
    },
  });

  const handleUnblock = useCallback(
    (user: BlockedUser) => {
      const label = user.handle ? `@${user.handle}` : 'this user';
      const msg = `Unblock ${label}? Their shop and items will be visible again.`;

      const doUnblock = () => unblockMutation.mutate(user.userId);

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm(msg)) {
          doUnblock();
        }
      } else {
        Alert.alert('Unblock user', msg, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unblock', onPress: doUnblock },
        ]);
      }
    },
    [unblockMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: BlockedUser }) => (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.shopName || item.handle || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shopName || item.handle || 'Unknown user'}
          </Text>
          {item.handle ? <Text style={styles.handle}>@{item.handle}</Text> : null}
        </View>
        <Pressable
          style={({ pressed }) => [styles.unblockBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => handleUnblock(item)}
          disabled={unblockMutation.isPending}
        >
          <Text style={styles.unblockBtnText}>Unblock</Text>
        </Pressable>
      </View>
    ),
    [handleUnblock, unblockMutation.isPending],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.navBar}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <View style={styles.navTitleBlock}>
          <Text style={styles.navBrand}>SlabHub</Text>
          <Text style={styles.navSubtitle}>Blocked users</Text>
        </View>
        <View style={styles.navBtn} />
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : !blocked || blocked.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color={c.textTertiary} />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyBody}>
            When you block someone, their shop and items are hidden from you. You can unblock them
            here at any time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  navBrand: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  navSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  separator: {
    height: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.accent,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  handle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceElevated,
  },
  unblockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
