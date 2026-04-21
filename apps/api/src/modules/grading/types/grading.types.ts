export type Grader = "PSA" | "BGS" | "OTHER";

export interface GradingLookupResult {
    grader: Grader;
    certNumber: string;
    success: boolean;
    data?: {
        gradeLabel: string;
        gradeValue: number | string;
        subgrades?: {
            centering?: number | string;
            corners?: number | string;
            edges?: number | string;
            surface?: number | string;
        };
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

export interface GradingRecognitionStep {
    name: string;
    durationMs: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
}

export interface GradingRecognitionTelemetry {
    startedAt: string;
    durationMs: number;
    steps: GradingRecognitionStep[];
}

export interface GradingRecognitionCandidate {
    id: string;
    title?: string;
    set?: string;
    cardNumber?: string;
    imageUrl?: string;
    productType?: string;
    rawPrice?: number;
    grade7Price?: number;
    grade8Price?: number;
    grade9Price?: number;
    grade95Price?: number;
    grade10Price?: number;
    sealedPrice?: number;
}

export interface GradingRecognitionResult {
    success: boolean;
    data?: {
        grader: Grader | string;
        certNumber: string;
        gradeLabel: string;
        gradeValue: number | string;
        subgrades?: {
            centering?: number | string;
            corners?: number | string;
            edges?: number | string;
            surface?: number | string;
        };
        cardName: string;
        setName: string;
        rawCardNumber?: string;
        language?: string;
        year?: string;
        rarity?: string;
        treatment?: string;
        refPriceChartingProductId?: string;
        marketPrice?: number;
        grade7Price?: number;
        grade8Price?: number;
        grade9Price?: number;
        grade95Price?: number;
        grade10Price?: number;
        sealedPrice?: number;
        productName?: string;
        productSet?: string;
        productNumber?: string;
        productImageUrl?: string;
        ambiguous?: boolean;
        candidates?: GradingRecognitionCandidate[];
    };
    durationMs?: number;
    error?: string;
}
