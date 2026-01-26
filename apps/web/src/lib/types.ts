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
    marketPriceSnapshot?: number;
    acquisitionDate: string;
    acquisitionSource?: string;
    storageLocation?: string;
    stage: InventoryStage;
    notes?: string;
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
}

export interface PricingSnapshot {
    cardProfileId: string;
    rawPrice: number;
    sealedPrice: number | null;
    updatedAt: string;
    source: "Mock:eBay" | "Mock:TCGPlayer";
}

export interface SellerProfile {
    handle: string;
    shopName: string;
    isActive: boolean;
    locationCountry: string;
    locationCity: string;
    paymentsAccepted: string[];
    meetupsEnabled: boolean;
    shippingEnabled: boolean;
    socials: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };
    wishlistText: string;
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
    priceChartingUrl?: string | null;
    rawPrice: number;
    sealedPrice: number | null;
    lastUpdated: string;
    source: string;
}

export interface MarketPriceHistoryEntry {
    date: string;
    title: string;
    price: number;
    source: string;
}

export interface MarketPriceHistory {
    productId: string;
    mode: "parsed" | "mock";
    parseError: string | null;
    prices: MarketPriceHistoryEntry[];
}

export interface MarketProductsResponse {
    items: MarketProduct[];
    page: number;
    limit: number;
    total: number;
}
