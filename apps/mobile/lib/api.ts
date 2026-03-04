import { apiRequest } from "./query-client";
import {
    InventoryItem,
    MarketProduct,
    MarketProductsResponse,
    SellerProfile,
    PortfolioHistoryEntry
} from "./types";

export async function listInventory(): Promise<InventoryItem[]> {
    const response = await apiRequest("GET", "/inventory");
    return response.json();
}

export async function getMe(): Promise<{ profile: SellerProfile } | null> {
    try {
        const response = await apiRequest("GET", "/me");
        return response.json();
    } catch (e) {
        return null;
    }
}

export async function getMarketProducts(params: { page: number; limit: number; search?: string }): Promise<MarketProductsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);

    const response = await apiRequest("GET", `/market/products?${searchParams.toString()}`);
    return response.json();
}

export async function getMarketValueHistory(days: number = 90): Promise<PortfolioHistoryEntry[]> {
    const response = await apiRequest("GET", `/inventory/stats/market-value-history?days=${days}`);
    return response.json();
}

export async function getMarketSyncStatus(): Promise<{ lastSyncAt: string } | null> {
    try {
        const response = await apiRequest("GET", "/market/sync-status");
        return response.json();
    } catch (e) {
        return null;
    }
}
