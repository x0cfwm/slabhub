import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local "recently visited shops" list. Written to every time the user
 * successfully opens another vendor's storefront (including via a
 * universal link), so they can revisit without the original URL.
 *
 * Stored per-device in AsyncStorage. No server sync today — see
 * ARCHITECTURE.md if/when we want cross-device history, the shape
 * below is designed to merge cleanly against the analytics stream
 * (`VIEW_SHOP` events already land in the backend).
 */

export type RecentShop = {
    handle: string;
    shopName: string;
    avatarUrl: string | null;
    /** Epoch ms of the most recent visit. */
    visitedAt: number;
};

const STORAGE_KEY = "@slabhub/recent_shops_v1";
const MAX_ENTRIES = 15;

async function readAll(): Promise<RecentShop[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Defensive: strip malformed entries written by an older build.
        return parsed.filter(
            (x): x is RecentShop =>
                !!x &&
                typeof x.handle === "string" &&
                typeof x.shopName === "string" &&
                typeof x.visitedAt === "number",
        );
    } catch {
        return [];
    }
}

async function writeAll(list: RecentShop[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // Swallow — a failed write just means the list won't persist; not fatal.
    }
}

/**
 * Record (or refresh) a visit to `shop`. Deduped by handle, sorted
 * most-recent-first, trimmed to {@link MAX_ENTRIES}.
 */
export async function addRecentShop(
    shop: Omit<RecentShop, "visitedAt">,
): Promise<void> {
    if (!shop.handle) return;
    const list = await readAll();
    const withoutCurrent = list.filter((s) => s.handle !== shop.handle);
    const next: RecentShop[] = [
        { ...shop, visitedAt: Date.now() },
        ...withoutCurrent,
    ].slice(0, MAX_ENTRIES);
    await writeAll(next);
}

/**
 * Return the stored list, most-recent-first. Pass `limit` to cap size.
 */
export async function getRecentShops(limit?: number): Promise<RecentShop[]> {
    const list = await readAll();
    const sorted = [...list].sort((a, b) => b.visitedAt - a.visitedAt);
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/**
 * Drop a single shop from history (used by swipe-to-delete).
 */
export async function removeRecentShop(handle: string): Promise<void> {
    if (!handle) return;
    const list = await readAll();
    const next = list.filter((s) => s.handle !== handle);
    if (next.length !== list.length) {
        await writeAll(next);
    }
}

/**
 * Clear the entire history. Not wired to any UI yet, but handy for
 * settings / debug menus.
 */
export async function clearRecentShops(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
