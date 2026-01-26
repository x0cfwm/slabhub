import { Grader } from "../../../api/src/modules/grading/types/grading.types";
import { MarketPriceHistory, MarketProductsResponse } from "./types";

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

export async function lookupGrading(grader: string, certNumber: string): Promise<GradingLookupResult> {
    const response = await fetch(`${API_BASE_URL}/v1/grading/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grader, certNumber }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Query failed with status ${response.status}`);
    }

    return response.json();
}

export async function getMarketProducts(params: { page: number; limit: number; search?: string }): Promise<MarketProductsResponse> {
    const url = new URL(`${API_BASE_URL}/v1/market/products`);
    url.searchParams.set('page', params.page.toString());
    url.searchParams.set('limit', params.limit.toString());
    if (params.search) {
        url.searchParams.set('search', params.search);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch market products');
    }
    return response.json();
}

export async function getProductPriceHistory(productId: string, refresh = false): Promise<MarketPriceHistory> {
    const url = new URL(`${API_BASE_URL}/v1/market/products/${productId}/prices`);
    if (refresh) {
        url.searchParams.set('refresh', 'true');
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch price history');
    }
    return response.json();
}
