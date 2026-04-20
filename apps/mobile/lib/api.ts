import { Platform } from "react-native";
import { apiRequest, getApiUrl, getStoredToken } from "./query-client";
import {
    GeneratedPosting,
    InventoryItem,
    MarketProduct,
    MarketProductsResponse,
    MarketSet,
    MarketPriceHistory,
    PostingGenerateRequest,
    SellerProfile,
    PortfolioHistoryEntry,
    GradingRecognitionResult,
    WorkflowStatus,
    VendorPageResponse
} from "./types";
import { optimizeLocalImage } from "./image-utils";

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

export async function uploadMedia(originalUri: string): Promise<{ mediaId: string; url: string }> {
    // 1. Optimize the local image before upload to save bandwidth and S3 space
    const optimizedUri = await optimizeLocalImage(originalUri);

    const formData = new FormData();

    // For mobile, we need to handle the URI properly
    const filename = optimizedUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const baseUrl = getApiUrl();
    const token = await getStoredToken();

    // For web, data URI from ImageManipulator needs to be converted to Blob
    if (Platform.OS === 'web') {
        const response = await fetch(optimizedUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
    } else {
        // Note: React Native's FormData.append expects an object with uri, name, type for files
        formData.append('file', {
            uri: optimizedUri,
            name: filename,
            type,
        } as any);
    }

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

export async function recognizeImage(originalUri: string): Promise<GradingRecognitionResult> {
    // 1. Optimize the local image before upload (especially useful to make recognition faster)
    const optimizedUri = await optimizeLocalImage(originalUri);

    const formData = new FormData();
    const filename = optimizedUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const baseUrl = getApiUrl();
    const token = await getStoredToken();

    if (Platform.OS === 'web') {
        const response = await fetch(optimizedUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
    } else {
        formData.append('file', {
            uri: optimizedUri,
            name: filename,
            type,
        } as any);
    }

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

export async function listStatuses(includeDisabled = false): Promise<WorkflowStatus[]> {
    const response = await apiRequest("GET", `/workflow/statuses${includeDisabled ? "?includeDisabled=true" : ""}`);
    return response.json();
}

export async function generatePosting(payload: PostingGenerateRequest): Promise<GeneratedPosting> {
    const response = await apiRequest("POST", "/posting/generate", payload);
    return response.json();
}

export async function getVendorPage(handle: string): Promise<VendorPageResponse> {
    const response = await apiRequest("GET", `/vendor/${handle}`);
    return response.json();
}

export async function trackShopEvent(data: {
    type: 'VIEW_SHOP' | 'VIEW_ITEM' | 'INQUIRY_START' | 'INQUIRY_COMPLETE';
    handle: string;
    itemId?: string;
    channel?: string;
}): Promise<void> {
    try {
        await apiRequest("POST", "/analytics/track", data);
    } catch (e) {
        // Analytics failures should not crash the app
        console.warn('[analytics] Failed to track event:', e);
    }
}
