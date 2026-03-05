export type PriceChartingProductType = 'SINGLE_CARD' | 'SEALED_PACK' | 'SEALED_BOX' | 'SEALED_OTHER';

export interface PriceChartingSaleEntry {
    date: string;
    title: string;
    price: number;
    source: string;
    link?: string;
    grade?: string;
}

export interface ParsedProductDetails {
    productUrl: string;
    tcgPlayerId?: number;
    priceChartingId?: number;
    cardNumber?: string;
    details: Record<string, string | null>;
    categorySlug?: string;
    setSlug?: string;
    setName?: string;
    setCode?: string;
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
    sales: PriceChartingSaleEntry[];
}

export interface PriceChartingCrawlOptions {
    maxProducts?: number;
    dryRun?: boolean;
    linkRefProducts?: boolean;
    onlySetSlug?: string;
    fresh?: boolean;
    images?: boolean;
}
