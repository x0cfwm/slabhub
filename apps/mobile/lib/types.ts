export type Game = "MAGIC" | "POKEMON" | "ONE_PIECE" | "LORCANA" | "YU_GI_OH";

export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";

export type GradingCompany = "PSA" | "BGS" | "CGC" | "ARS" | "SGC";

export type InventoryStage =
    | "ACQUIRED"
    | "IN_TRANSIT"
    | "BEING_GRADED"
    | "AUTHENTICATED"
    | "IN_STOCK"
    | "LISTED"
    | "SOLD"
    | "ARCHIVED";

export type ProductType =
    | "BOOSTER_BOX"
    | "BOOSTER_PACK"
    | "STARTER_DECK"
    | "ILLUSTRATION_BOX"
    | "MINI_TIN"
    | "PREMIUM_BOX"
    | "GIFT_BOX"
    | "ANNIVERSARY_SET"
    | "PROMO_PACK"
    | "TOURNAMENT_KIT"
    | "CASE"
    | "BUNDLE"
    | "OTHER";

export interface InventoryBase {
    id: string;
    acquisitionPrice: number;
    listingPrice?: number;
    marketPriceSnapshot?: number;
    marketPrice?: number;
    acquisitionDate: string;
    acquisitionSource?: string;
    storageLocation?: string;
    stage: InventoryStage;
    sortOrder: number;
    notes?: string;
    photos?: string[];
    sellingDescription?: string;
    refPriceChartingProductId?: string;
    productName?: string;
    setName?: string;
    cardProfile?: any;
    createdAt: string;
    statusId?: string;
}

export interface SingleCardRaw extends InventoryBase {
    type: "SINGLE_CARD_RAW";
    cardVariantId: string;
    condition: Condition;
    quantity: number;
}

export interface SingleCardGraded extends InventoryBase {
    type: "SINGLE_CARD_GRADED";
    cardVariantId: string;
    gradingCompany: GradingCompany;
    grade: number | string;
    quantity: 1;
}

export interface SealedProduct extends InventoryBase {
    type: "SEALED_PRODUCT";
    productName: string;
    productType: ProductType;
    quantity: number;
}

export type InventoryItem = SingleCardRaw | SingleCardGraded | SealedProduct;

export interface SellerProfile {
    handle: string;
    shopName: string;
    isActive: boolean;
    location: string;
    avatarUrl?: string | null;
    paymentsAccepted: string[];
    fulfillmentOptions: string[];
    meetupsEnabled?: boolean;
    shippingEnabled?: boolean;
    wishlistText: string;
    upcomingEvents: { name: string; date?: string; location?: string }[];
    referenceLinks: { title: string; url: string }[];
    socials?: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };
}

export interface MarketProduct {
    id: string;
    name: string;
    number: string | null;
    imageUrl: string | null;
    set: string;
    setCode?: string | null;
    productType?: string | null;
    priceChartingUrl?: string | null;
    rawPrice: number;
    sealedPrice?: number | null;
    grade7Price?: number | null;
    grade8Price?: number | null;
    grade9Price?: number | null;
    grade95Price?: number | null;
    grade10Price?: number | null;
    lastUpdated: string;
    source: string;
}

export interface MarketPriceHistoryEntry {
    date: string;
    title: string;
    price: number;
    source: string;
    link?: string;
    grade?: string;
}

export interface MarketPriceHistory {
    productId: string;
    mode: "parsed" | "mock";
    parseError: string | null;
    prices: MarketPriceHistoryEntry[];
    summary?: {
        ungraded?: number;
        grade7?: number;
        grade8?: number;
        grade9?: number;
        grade95?: number;
        psa10?: number;
    };
    updatedRawPrice?: number | null;
}

export interface MarketSet {
    externalId: string;
    name: string;
    code?: string | null;
}

export interface MarketProductsResponse {
    items: MarketProduct[];
    page: number;
    limit: number;
    total: number;
}

export interface PortfolioHistoryEntry {
    date: string;
    value: number;
    cost: number;
    count?: number;
    soldRevenue?: number;
    soldCost?: number;
    soldCount?: number;
    realizedPnl?: number;
    unrealizedPnl?: number;
    totalPnl?: number;
}

export interface GradingRecognitionResult {
    success: boolean;
    data?: {
        grader: GradingCompany | string;
        certNumber: string;
        gradeLabel: string;
        gradeValue: number | string;
        subgrades?: {
            centering?: number | string;
            corners?: number | string;
            edges?: number | string;
            surface?: number | string;
        };
        certificationNumber?: string;
        cardName: string;
        setName: string;
        setCode?: string;
        cardNumber?: string;
        language?: string;
        year?: string;
        refPriceChartingProductId?: string;
        productName?: string;
        productSet?: string;
        productNumber?: string;
        productImageUrl?: string;
        marketPrice?: number;
        grade7Price?: number | null;
        grade8Price?: number | null;
        grade9Price?: number | null;
        grade95Price?: number | null;
        grade10Price?: number | null;
        sealedPrice?: number | null;
    };
    durationMs?: number;
    error?: string;
}
export interface WorkflowStatus {
    id: string;
    name: string;
    color: string | null;
    position: number;
    isEnabled: boolean;
    systemId: InventoryStage | null;
    showOnKanban: boolean;
    _count?: {
        items: number;
    };
}

export type PostingSelectionMode = 'BY_STATUS' | 'MANUAL';
export type PostingPlatform = 'FACEBOOK' | 'INSTAGRAM';
export type PostingTone = 'HYPE' | 'PROFESSIONAL' | 'CONCISE';
export type PostingLanguage = 'EN' | 'RU';
export type PostingTemplate = 'GRID' | 'COLLAGE';
export type PostingRatio = '1:1' | '4:5' | '9:16';
export type PostingBackground = 'DARK' | 'LIGHT' | 'SUNSET';
export type PostingGenerationTarget = 'BOTH' | 'TEXT_ONLY' | 'IMAGE_ONLY';

export interface PostingTextOptions {
    platform: PostingPlatform;
    tone: PostingTone;
    language?: PostingLanguage;
    includePrice?: boolean;
    includeCondition?: boolean;
    includeGrade?: boolean;
    includeHashtags?: boolean;
    includeCta?: boolean;
}

export interface PostingVisualOptions {
    template: PostingTemplate;
    ratio: PostingRatio;
    showPriceBadge?: boolean;
    showPerformanceTag?: boolean;
    showWatermark?: boolean;
    backgroundStyle?: PostingBackground;
}

export interface PostingGenerateRequest {
    selectionMode: PostingSelectionMode;
    statusIds?: string[];
    itemIds?: string[];
    textOptions: PostingTextOptions;
    visualOptions: PostingVisualOptions;
    generationTarget?: PostingGenerationTarget;
}

export interface GeneratedPosting {
    id: string;
    createdAt: string;
    generationTarget: PostingGenerationTarget;
    itemCount: number;
    caption: string;
    imageDataUrl: string[];
    textOptions: PostingTextOptions;
    visualOptions: PostingVisualOptions;
}
