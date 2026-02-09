export type PriceChartingProductType = 'SINGLE_CARD' | 'SEALED_PACK' | 'SEALED_BOX' | 'SEALED_OTHER';
export interface ParsedProductDetails {
    productUrl: string;
    tcgPlayerId?: number;
    priceChartingId?: number;
    cardNumber?: string;
    details: Record<string, string | null>;
    categorySlug?: string;
    setSlug?: string;
    setName?: string;
    productSlug?: string;
    title?: string;
    imageUrl?: string;
    localImagePath?: string;
    productType?: PriceChartingProductType;
    rawPrice?: number;
    sealedPrice?: number;
    grade7Price?: number;
    grade8Price?: number;
    grade9Price?: number;
    grade95Price?: number;
    grade10Price?: number;
}
export interface PriceChartingCrawlOptions {
    maxProducts?: number;
    dryRun?: boolean;
    linkRefProducts?: boolean;
    onlySetSlug?: string;
    fresh?: boolean;
}
