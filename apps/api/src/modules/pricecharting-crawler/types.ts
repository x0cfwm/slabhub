export interface ParsedProductDetails {
    productUrl: string;
    tcgPlayerId?: number;
    priceChartingId?: number;
    cardNumber?: string;
    details: Record<string, string | null>;
    categorySlug?: string;
    setSlug?: string;
    productSlug?: string;
}

export interface PriceChartingCrawlOptions {
    maxProducts?: number;
    dryRun?: boolean;
    linkRefProducts?: boolean;
    onlySetSlug?: string;
}
