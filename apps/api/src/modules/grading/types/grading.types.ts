export type Grader = "PSA" | "BGS" | "CGC" | "SGC" | "ARS";

export interface GradingLookupResult {
    grader: Grader;
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
