import { Grader } from "../../../api/src/modules/grading/types/grading.types";
import { MarketPriceHistory, MarketProductsResponse, MarketSet } from "./types";

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

export async function requestOtp(email: string) {
    const url = getFullUrl('/v1/auth/email/request-otp');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to request OTP');
    }

    return response.json();
}

export async function verifyOtp(email: string, otp: string) {
    const url = getFullUrl('/v1/auth/email/verify-otp');
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
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

export async function getMarketProducts(params: { page: number; limit: number; search?: string; onlyLinked?: boolean; setExternalId?: string }): Promise<MarketProductsResponse> {
    const url = getFullUrl('/v1/market/products');
    url.searchParams.set('page', params.page.toString());
    url.searchParams.set('limit', params.limit.toString());
    if (params.search) {
        url.searchParams.set('search', params.search);
    }
    if (params.onlyLinked) {
        url.searchParams.set('onlyLinked', 'true');
    }
    if (params.setExternalId) {
        url.searchParams.set('setExternalId', params.setExternalId);
    }

    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Failed to fetch market products');
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
