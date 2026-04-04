export type Game = "MAGIC" | "POKEMON" | "ONE_PIECE" | "LORCANA" | "YU_GI_OH";

export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";

export type GradingCompany = "PSA" | "BGS" | "OTHER";

export type InventoryStage =
    | "ACQUIRED"
    | "IN_TRANSIT"
    | "BEING_GRADED"
    | "AUTHENTICATED"
    | "IN_STOCK"
    | "LISTED"
    | "SOLD"
    | "ARCHIVED";

export interface WorkflowStatus {
    id: string;
    name: string;
    color: string | null;
    position: number;
    systemId: string | null;
    isEnabled: boolean;
    showOnKanban: boolean;
    _count?: {
        items: number;
    };
}

export type SealedIntegrity = "MINT" | "MINOR_DENTS" | "DAMAGED" | "OPENED";

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

export type VariantType = "NORMAL" | "ALTERNATE_ART" | "PARALLEL_FOIL";

export type Language = "JP" | "EN";

export interface CardVariant {
    id: string;
    game: Game;
    cardId: string; // Reference to base CardProfile
    variantType: VariantType;
    language: Language;
    imageUrl: string;
    // Mirrored for performance/denormalization
    name: string;
    setName: string;
    setNumber: string;
}

export interface InventoryBase {
    id: string;
    acquisitionPrice: number;
    listingPrice?: number;
    soldPrice?: number;
    soldDate?: string;
    marketPriceSnapshot?: number;
    marketPrice?: number;
    acquisitionDate: string;
    acquisitionSource?: string;
    storageLocation?: string;
    stage: InventoryStage;
    statusId?: string;
    status?: WorkflowStatus;
    sortOrder: number;
    notes?: string;
    photos?: string[];
    sellingDescription?: string;
    refPriceChartingProductId?: string;
    productName?: string;
    setName?: string;
    cardProfile?: CardProfile;
    createdAt: string;
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
    grade: number | string; // 10, 9.5, "Authentic", etc.
    gradeProvider?: GradingCompany;
    gradeValue?: string;
    certNumber: string;
    certificationNumber?: string;
    gradingMeta?: any;
    quantity: 1; // Always 1 for graded cards
    gradingCost?: number;
    slabImages: {
        front?: string;
        back?: string;
    };
    // Re-submission history / Archive
    previousCertNumbers?: string[];
}

export interface SealedProduct extends InventoryBase {
    type: "SEALED_PRODUCT";
    productName: string;
    productType: ProductType;
    language: string;
    setName?: string;
    edition?: string; // e.g. "1st Edition", "Unlimited"
    integrity: SealedIntegrity;
    quantity: number;
    configuration: {
        containsBoosters: boolean;
        boosterSets?: string[];
        packsPerUnit?: number;
        containsFixedCards: boolean;
        containsPromo: boolean;
    };
}

export type InventoryItem = SingleCardRaw | SingleCardGraded | SealedProduct;

export interface CardProfile {
    id: string;
    name: string;
    set: string;
    rarity: string;
    cardNumber: string;
    imageUrl: string;
    rawPrice?: number | null;
    sealedPrice?: number | null;
}

export interface PricingSnapshot {
    cardProfileId: string;
    rawPrice: number;
    sealedPrice?: number | null;
    updatedAt: string;
    source: "Mock:eBay" | "Mock:TCGPlayer";
}

export interface SellerProfile {
    handle: string;
    shopName: string;
    isActive: boolean;
    location: string;
    paymentsAccepted: string[];
    meetupsEnabled: boolean;
    shippingEnabled: boolean;
    fulfillmentOptions: string[];
    socials: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };
    wishlistText: string;
    referenceLinks: { title: string; url: string }[];
    upcomingEvents: { name: string; date?: string; location?: string }[];
    avatarId?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
    facebookProfileUrl?: string | null;
    facebookVerifiedAt?: string | null;
}

export interface AppState {
    sellerProfile: SellerProfile | null;
    cardProfiles: CardProfile[];
    pricingSnapshots: PricingSnapshot[];
    inventoryItems: InventoryItem[];
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

export interface MarketProductsResponse {
    items: MarketProduct[];
    page: number;
    limit: number;
    total: number;
}

export interface MarketSet {
    externalId: string;
    name: string;
    code?: string | null;
}

export interface Invite {
    id: string;
    tokenHash: string;
    token?: string; // Original token if just created/retrieved
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
    maxUses: number;
    usedCount: number;
}

export interface InviteAcceptance {
    acceptedAt: string;
    invitedEmailMasked: string;
}

export interface PortfolioHistoryEntry {
    date: string;
    value: number;          // Active portfolio market value
    cost: number;           // Active portfolio cost basis
    count: number;          // Active item count
    soldRevenue: number;    // Cumulative revenue from sold items
    soldCost: number;       // Cumulative cost basis of sold items
    soldCount: number;      // Cumulative count of sold items
    realizedPnl: number;    // soldRevenue - soldCost
    unrealizedPnl: number;  // value - cost
    totalPnl: number;       // realizedPnl + unrealizedPnl
}

export type PostingSelectionMode = "BY_STATUS" | "MANUAL";
export type PostingPlatform = "FACEBOOK" | "INSTAGRAM";
export type PostingTone = "HYPE" | "PROFESSIONAL" | "CONCISE";
export type PostingLanguage = "EN" | "RU";
export type PostingTemplate = "GRID" | "COLLAGE";
export type PostingRatio = "1:1" | "4:5" | "9:16";
export type PostingBackground = "DARK" | "LIGHT" | "SUNSET";
export type PostingGenerationTarget = "BOTH" | "TEXT_ONLY" | "IMAGE_ONLY";

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

export interface PostingSelectedItem {
    id: string;
    title: string;
    subtitle: string;
    grade: string | null;
    condition: string | null;
    price: number | null;
    imageUrl: string | null;
    statusName: string | null;
}

export interface GeneratedPosting {
    id: string;
    createdAt: string;
    generationTarget: PostingGenerationTarget;
    itemCount: number;
    caption: string;
    imageDataUrl: string[];
    items: PostingSelectedItem[];
    textOptions: PostingTextOptions;
    visualOptions: PostingVisualOptions;
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
        cardName: string;
        setName: string;
        rawCardNumber?: string;
        language?: string;
        year?: string;
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
    };
    durationMs?: number;
    error?: string;
}
