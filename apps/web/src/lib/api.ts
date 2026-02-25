import { Grader } from "../../../api/src/modules/grading/types/grading.types";
import { MarketPriceHistory, MarketProduct, MarketProductsResponse, MarketSet, InventoryItem, SellerProfile, PortfolioHistoryEntry } from "./types";

export interface GradingLookupResult {
    grader: string;
    certNumber: string;
    success: boolean;
    data?: {
        gradeLabel: string;
        gradeValue: number | string;
        cardName: string;
        setName: string;
        cardNumber?: string;
        year?: string;
        variant?: string;
        population?: number;
        images?: {
            frontUrl?: string;
            backUrl?: string;
        };
        raw?: Record<string, any>;
    };
    error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getFullUrl(path: string) {
    if (API_BASE_URL.startsWith('http')) {
        return new URL(`${API_BASE_URL}${path}`);
    }
    // Handle relative path (for Netlify proxy)
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return new URL(`${API_BASE_URL}${path}`, base);
}

export async function requestOtp(email: string, inviteToken?: string) {
    const url = getFullUrl('/v1/auth/email/request-otp');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, inviteToken }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to request OTP');
    }

    return response.json();
}

export async function verifyOtp(email: string, otp: string, inviteToken?: string) {
    const url = getFullUrl('/v1/auth/email/verify-otp');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, inviteToken }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to verify OTP');
    }

    return response.json();
}

export async function getMe() {
    try {
        const url = getFullUrl('/v1/me');
        const response = await fetch(url.toString(), {
            credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
    } catch (e) {
        return null;
    }
}

export async function logout() {
    const url = getFullUrl('/v1/auth/logout');
    const response = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to logout');
    }

    return response.json();
}

export async function lookupGrading(grader: string, certNumber: string): Promise<GradingLookupResult> {
    const url = getFullUrl('/v1/grading/lookup');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grader, certNumber }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Query failed with status ${response.status}`);
    }

    return response.json();
}

export async function getMarketProducts(params: { page: number; limit: number; search?: string; setExternalId?: string; productType?: string; onlyInInventory?: boolean }): Promise<MarketProductsResponse> {
    const url = getFullUrl('/v1/market/products');
    url.searchParams.set('page', params.page.toString());
    url.searchParams.set('limit', params.limit.toString());
    if (params.search) {
        url.searchParams.set('search', params.search);
    }
    if (params.setExternalId) {
        url.searchParams.set('setExternalId', params.setExternalId);
    }
    if (params.productType) {
        url.searchParams.set('productType', params.productType);
    }
    if (params.onlyInInventory) {
        url.searchParams.set('onlyInInventory', 'true');
    }

    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch market products');
    }
    return response.json();
}

export async function getMarketProduct(id: string): Promise<MarketProduct> {
    const url = getFullUrl(`/v1/market/products/${id}`);
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch market product');
    }
    return response.json();
}

export async function getMarketSets(): Promise<MarketSet[]> {
    const url = getFullUrl('/v1/market/sets');
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch market sets');
    }
    return response.json();
}

export async function getProductPriceHistory(productId: string, refresh = false): Promise<MarketPriceHistory> {
    const url = getFullUrl(`/v1/market/products/${productId}/prices`);
    if (refresh) {
        url.searchParams.set('refresh', 'true');
    }
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch price history');
    }
    return response.json();
}

export async function listInventory(): Promise<InventoryItem[]> {
    const url = getFullUrl('/v1/inventory');
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch inventory');
    }
    return response.json();
}

export async function createInventoryItem(item: any): Promise<InventoryItem> {
    const url = getFullUrl('/v1/inventory');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to create inventory item');
    }
    return response.json();
}

export async function updateInventoryItem(id: string, patch: any): Promise<InventoryItem> {
    const url = getFullUrl(`/v1/inventory/${id}`);
    const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to update inventory item');
    }
    return response.json();
}

export async function deleteInventoryItem(id: string): Promise<void> {
    const url = getFullUrl(`/v1/inventory/${id}`);
    const response = await fetch(url.toString(), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete inventory item from server');
    }
}

export async function reorderInventoryItems(items: { id: string; sortOrder: number; stage: string }[]): Promise<void> {
    const url = getFullUrl('/v1/inventory/reorder');
    const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reorder inventory items');
    }
}

export async function getMarketValueHistory(days: number = 90): Promise<PortfolioHistoryEntry[]> {
    const url = getFullUrl('/v1/inventory/stats/market-value-history');
    url.searchParams.set('days', days.toString());
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch market value history');
    }
    return response.json();
}

export async function uploadFile(file: File): Promise<{ url: string }> {
    const url = getFullUrl('/v1/media/upload');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload file');
    }

    return response.json();
}

export async function deleteFile(fileUrl: string): Promise<void> {
    const url = getFullUrl('/v1/media');
    const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: fileUrl }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete file');
    }
}


export async function updateProfile(patch: any): Promise<SellerProfile> {
    const url = getFullUrl('/v1/me');
    const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile');
    }
    return response.json();
}

export async function deleteAccount(): Promise<void> {
    const url = getFullUrl('/v1/me');
    const response = await fetch(url.toString(), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete account');
    }
}

export async function getVendorPage(handle: string): Promise<{ profile: SellerProfile, items: InventoryItem[] }> {
    const url = getFullUrl(`/v1/vendor/${handle}`);
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch vendor page');
    }
    return response.json();
}

export async function joinWaitlist(email: string, name?: string) {
    const url = getFullUrl('/v1/waitlist');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to join waitlist');
    }

    return response.json();
}

export async function getMyInvite() {
    const url = getFullUrl('/v1/invites/me');
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch invite');
    return response.json();
}

export async function getAcceptedInvites() {
    const url = getFullUrl('/v1/invites/accepted');
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch accepted invites');
    return response.json();
}

export async function getInvitePreview(token: string) {
    const url = getFullUrl(`/v1/invites/preview/${token}`);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Invite invalid or expired');
    return response.json();
}
