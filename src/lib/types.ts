export type InventoryStage =
    | "ACQUIRED"
    | "IN_TRANSIT"
    | "IN_STOCK_UNGRADED"
    | "BEING_GRADED"
    | "UNGRADED_FOR_SALE"
    | "GRADED_FOR_SALE";

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

export type ItemType = "RAW" | "GRADED" | "SEALED";
export type GradeProvider = "PSA" | "BGS" | null;

export interface InventoryItem {
    id: string;
    cardProfileId: string;
    itemType: ItemType;
    gradeProvider?: GradeProvider;
    gradeValue?: number | null;
    quantity: number;
    stage: InventoryStage;
    listingPrice: number | null;
    acquisitionPrice: number | null;
    photos: {
        front?: string;
        back?: string;
        extra?: string[];
    };
    createdAt: string;
}

export interface AppState {
    sellerProfile: SellerProfile | null;
    cardProfiles: CardProfile[];
    pricingSnapshots: PricingSnapshot[];
    inventoryItems: InventoryItem[];
}
