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
    rawPrice: number;
    sealedPrice?: number | null;
    grade7Price?: number | null;
    grade8Price?: number | null;
    grade9Price?: number | null;
    grade95Price?: number | null;
    grade10Price?: number | null;
    lastUpdated: string;
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
}
