import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import ReanimatedSwipeable, {
    SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { FlatList } from "react-native-gesture-handler";
import Animated, {
    SharedValue,
    useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
    RecentShop,
    getRecentShops,
    removeRecentShop,
} from "@/lib/recent-shops";

const c = Colors.dark;

/**
 * "Recent shops" — local history of vendor storefronts the user has
 * opened (including via universal links). Rows are tap-to-open and
 * swipe-left to delete.
 */
export default function RecentShopsScreen() {
    const insets = useSafeAreaInsets();
    const [shops, setShops] = useState<RecentShop[] | null>(null);
    // Track the currently-open row so we can close it when another opens.
    const openRowRef = useRef<SwipeableMethods | null>(null);

    const load = useCallback(async () => {
        const list = await getRecentShops();
        setShops(list);
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const handleOpen = useCallback((handle: string) => {
        router.push(`/vendor/${handle}` as any);
    }, []);

    const handleDelete = useCallback(async (handle: string) => {
        // Optimistic UI: drop the row immediately, then persist.
        setShops((prev) => (prev ? prev.filter((s) => s.handle !== handle) : prev));
        await removeRecentShop(handle);
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: RecentShop }) => (
            <RecentShopRow
                shop={item}
                openRowRef={openRowRef}
                onOpen={handleOpen}
                onDelete={handleDelete}
            />
        ),
        [handleDelete, handleOpen],
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.navBar}>
                <Pressable
                    style={({ pressed }) => [
                        styles.navBtn,
                        { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => router.back()}
                    accessibilityLabel="Back"
                >
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </Pressable>
                <View style={styles.navTitleBlock}>
                    <Text style={styles.navBrand}>SlabHub</Text>
                    <Text style={styles.navSubtitle}>Recent shops</Text>
                </View>
                {/* Spacer to keep the title optically centred against the back button. */}
                <View style={styles.navBtn} />
            </View>

            {shops === null ? null : shops.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons
                        name="time-outline"
                        size={48}
                        color={c.textTertiary}
                    />
                    <Text style={styles.emptyTitle}>No recent shops yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Shops you open will show up here so you can come back
                        without the original link.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={shops}
                    keyExtractor={(s) => s.handle}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => (
                        <View style={styles.separator} />
                    )}
                />
            )}
        </View>
    );
}

function RecentShopRow({
    shop,
    openRowRef,
    onOpen,
    onDelete,
}: {
    shop: RecentShop;
    openRowRef: React.MutableRefObject<SwipeableMethods | null>;
    onOpen: (handle: string) => void;
    onDelete: (handle: string) => void;
}) {
    const swipeableRef = useRef<SwipeableMethods | null>(null);

    const renderRightActions = useCallback(
        (_progress: SharedValue<number>, translation: SharedValue<number>) => (
            <DeleteAction
                translation={translation}
                onPress={() => {
                    swipeableRef.current?.close();
                    onDelete(shop.handle);
                }}
            />
        ),
        [onDelete, shop.handle],
    );

    return (
        <ReanimatedSwipeable
            ref={swipeableRef}
            friction={2}
            rightThreshold={40}
            renderRightActions={renderRightActions}
            onSwipeableWillOpen={() => {
                // Close any previously-open row so only one is open at a time.
                if (
                    openRowRef.current &&
                    openRowRef.current !== swipeableRef.current
                ) {
                    openRowRef.current.close();
                }
                openRowRef.current = swipeableRef.current;
            }}
        >
            <Pressable
                style={({ pressed }) => [
                    styles.row,
                    { opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => onOpen(shop.handle)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${shop.shopName}`}
                accessibilityActions={[
                    { name: "magicTap", label: "Remove from recent shops" },
                ]}
                onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === "magicTap") {
                        onDelete(shop.handle);
                    }
                }}
            >
                <View style={styles.avatarWrap}>
                    {shop.avatarUrl ? (
                        <Image
                            source={{ uri: shop.avatarUrl }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Ionicons
                                name="storefront-outline"
                                size={18}
                                color={c.textTertiary}
                            />
                        </View>
                    )}
                </View>
                <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                        {shop.shopName || shop.handle}
                    </Text>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {`@${shop.handle} · ${formatVisitedAt(shop.visitedAt)}`}
                    </Text>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={c.textTertiary}
                />
            </Pressable>
        </ReanimatedSwipeable>
    );
}

function DeleteAction({
    translation,
    onPress,
}: {
    translation: SharedValue<number>;
    onPress: () => void;
}) {
    // Keep the delete button anchored to the right edge as the row slides open.
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translation.value + DELETE_WIDTH }],
    }));

    return (
        <Animated.View style={[styles.deleteWrap, animatedStyle]}>
            <Pressable
                style={({ pressed }) => [
                    styles.deleteBtn,
                    { opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={onPress}
                accessibilityLabel="Remove from recent shops"
                accessibilityRole="button"
            >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
        </Animated.View>
    );
}

const DELETE_WIDTH = 88;

function formatVisitedAt(ms: number): string {
    const diff = Date.now() - ms;
    if (diff < 60_000) return "just now";
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    navBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 12,
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: c.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    navTitleBlock: {
        flex: 1,
        alignItems: "center",
    },
    navBrand: {
        fontSize: 11,
        color: c.accent,
        fontWeight: "600",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    navSubtitle: {
        fontSize: 15,
        fontWeight: "700",
        color: c.text,
        marginTop: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 32,
    },
    separator: {
        height: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: c.surface,
        borderRadius: 12,
    },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: c.surfaceElevated,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    rowText: {
        flex: 1,
        minWidth: 0,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: c.text,
    },
    rowSubtitle: {
        fontSize: 12,
        color: c.textSecondary,
        marginTop: 2,
    },
    deleteWrap: {
        width: DELETE_WIDTH,
        justifyContent: "center",
        alignItems: "stretch",
    },
    deleteBtn: {
        flex: 1,
        backgroundColor: c.error,
        borderRadius: 12,
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    deleteText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: c.text,
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        color: c.textSecondary,
        textAlign: "center",
        lineHeight: 20,
    },
});
