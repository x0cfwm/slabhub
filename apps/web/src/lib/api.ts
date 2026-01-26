import { Grader } from "../../../api/src/modules/grading/types/grading.types";

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
