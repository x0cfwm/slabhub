import * as SecureStore from "expo-secure-store";
import { apiRequest, getApiUrl } from "./query-client";
import {
    InventoryItem,
    MarketProduct,
    MarketProductsResponse,
    MarketSet,
    MarketPriceHistory,
    SellerProfile,
    PortfolioHistoryEntry,
    GradingRecognitionResult
} from "./types";

export async function listInventory(): Promise<InventoryItem[]> {
    const response = await apiRequest("GET", "/inventory");
    return response.json();
}

export async function createInventoryItem(data: any): Promise<InventoryItem> {
    const response = await apiRequest("POST", "/inventory", data);
    return response.json();
}

export async function updateInventoryItem(id: string, data: any): Promise<InventoryItem> {
    const response = await apiRequest("PATCH", `/inventory/${id}`, data);
    return response.json();
}

export async function deleteInventoryItem(id: string): Promise<void> {
    await apiRequest("DELETE", `/inventory/${id}`);
}

export async function uploadMedia(uri: string): Promise<{ mediaId: string; url: string }> {
    const formData = new FormData();

    // For mobile, we need to handle the URI properly
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    // Note: React Native's FormData.append expects an object with uri, name, type for files
    formData.append('file', {
        uri,
        name: filename,
        type,
    } as any);

    const baseUrl = getApiUrl();
    const token = await SecureStore.getItemAsync("slabhub_session_token");

    const res = await fetch(`${baseUrl}media/upload`, {
        method: 'POST',
        headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Upload failed");
    }

    return res.json();
}

export async function updateProfile(data: any): Promise<{ profile: SellerProfile }> {
    const response = await apiRequest("PATCH", "/me", data);
    return response.json();
}

export async function getMe(): Promise<{ profile: SellerProfile } | null> {
    try {
        const response = await apiRequest("GET", "/me");
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("[api.getMe] Error fetching current user:", e);
        return null;
    }
}

export async function getMarketProducts(params: {
    page: number;
    limit: number;
    search?: string;
    setExternalId?: string;
    productType?: string;
    onlyInInventory?: boolean;
}): Promise<MarketProductsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.setExternalId) searchParams.set("setExternalId", params.setExternalId);
    if (params.productType) searchParams.set("productType", params.productType);
    if (params.onlyInInventory) searchParams.set("onlyInInventory", "true");

    const response = await apiRequest("GET", `/market/products?${searchParams.toString()}`);
    return response.json();
}

export async function getMarketProduct(id: string): Promise<MarketProduct> {
    const response = await apiRequest("GET", `/market/products/${id}`);
    return response.json();
}

export async function getMarketSets(): Promise<MarketSet[]> {
    const response = await apiRequest("GET", "/market/sets");
    return response.json();
}

export async function getProductPriceHistory(productId: string, refresh = false): Promise<MarketPriceHistory> {
    const path = `/market/products/${productId}/prices${refresh ? "?refresh=true" : ""}`;
    const response = await apiRequest("GET", path);
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

export async function recognizeImage(uri: string): Promise<GradingRecognitionResult> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', {
        uri,
        name: filename,
        type,
    } as any);

    const baseUrl = getApiUrl();
    const token = await SecureStore.getItemAsync("slabhub_session_token");

    const res = await fetch(`${baseUrl}grading/recognize`, {
        method: 'POST',
        headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Recognition failed");
    }

    return res.json();
}
