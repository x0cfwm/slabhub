import { CardProfile, PricingSnapshot, SellerProfile, InventoryItem, AppState } from "./types";

export const INITIAL_CARD_PROFILES: CardProfile[] = [
    { id: "op01-001", name: "Monkey.D.Luffy", set: "Romance Dawn", rarity: "L", cardNumber: "OP01-001", imageUrl: "/cards/op01-001.svg" },
    { id: "op01-016", name: "Nami", set: "Romance Dawn", rarity: "R", cardNumber: "OP01-016", imageUrl: "/cards/op01-016.svg" },
    { id: "op01-024", name: "Kozuki Momonosuke", set: "Romance Dawn", rarity: "UC", cardNumber: "OP01-024", imageUrl: "/cards/op01-024.svg" },
    { id: "op01-047", name: "Trafalgar Law", set: "Romance Dawn", rarity: "SR", cardNumber: "OP01-047", imageUrl: "/cards/op01-047.svg" },
    { id: "op01-070", name: "Dracule Mihawk", set: "Romance Dawn", rarity: "SR", cardNumber: "OP01-070", imageUrl: "/cards/op01-070.svg" },
    { id: "op01-120", name: "Shanks", set: "Romance Dawn", rarity: "SEC", cardNumber: "OP01-120", imageUrl: "/cards/op01-120.svg" },
    { id: "op02-001", name: "Edward.Newgate", set: "Paramount War", rarity: "L", cardNumber: "OP02-001", imageUrl: "/cards/op02-001.svg" },
    { id: "op02-013", name: "Portgas.D.Ace", set: "Paramount War", rarity: "SR", cardNumber: "OP02-013", imageUrl: "/cards/op02-013.svg" },
    { id: "op02-036", name: "Nami", set: "Paramount War", rarity: "SR", cardNumber: "OP02-036", imageUrl: "/cards/op02-036.svg" },
    { id: "op02-121", name: "Kuzan", set: "Paramount War", rarity: "SEC", cardNumber: "OP02-121", imageUrl: "/cards/op02-121.svg" },
    { id: "op03-001", name: "Portgas.D.Ace", set: "Pillars of Strength", rarity: "L", cardNumber: "OP03-001", imageUrl: "/cards/op03-001.svg" },
    { id: "op03-022", name: "Arlong", set: "Pillars of Strength", rarity: "L", cardNumber: "OP03-022", imageUrl: "/cards/op03-022.svg" },
    { id: "op03-122", name: "Sogeking", set: "Pillars of Strength", rarity: "SEC", cardNumber: "OP03-122", imageUrl: "/cards/op03-122.svg" },
    { id: "op04-001", name: "Donquixote Doflamingo", set: "Kingdoms of Intrigue", rarity: "L", cardNumber: "OP04-001", imageUrl: "/cards/op04-001.svg" },
    { id: "op04-083", name: "Rebecca", set: "Kingdoms of Intrigue", rarity: "L", cardNumber: "OP04-083", imageUrl: "/cards/op04-083.svg" },
    { id: "op05-001", name: "Sabo", set: "Awakening of the New Era", rarity: "L", cardNumber: "OP05-001", imageUrl: "/cards/op05-001.svg" },
    { id: "op05-060", name: "Monkey.D.Luffy", set: "Awakening of the New Era", rarity: "L", cardNumber: "OP05-060", imageUrl: "/cards/op05-060.svg" },
    { id: "op05-118", name: "Kaido", set: "Awakening of the New Era", rarity: "SEC", cardNumber: "OP05-118", imageUrl: "/cards/op05-118.svg" },
    { id: "op05-119", name: "Monkey.D.Luffy", set: "Awakening of the New Era", rarity: "SEC", cardNumber: "OP05-119", imageUrl: "/cards/op05-119.svg" },
    { id: "op06-001", name: "Uta", set: "Wings of the Captain", rarity: "L", cardNumber: "OP06-001", imageUrl: "/cards/op06-001.svg" },
    { id: "op06-022", name: "Yamato", set: "Wings of the Captain", rarity: "L", cardNumber: "OP06-022", imageUrl: "/cards/op06-022.svg" },
    { id: "op06-086", name: "Gecko Moria", set: "Wings of the Captain", rarity: "SR", cardNumber: "OP06-086", imageUrl: "/cards/op06-086.svg" },
    { id: "st01-001", name: "Monkey.D.Luffy", set: "Straw Hat Crew Starter Deck", rarity: "L", cardNumber: "ST01-001", imageUrl: "/cards/st01-001.svg" },
    { id: "st01-012", name: "Roronoa Zoro", set: "Straw Hat Crew Starter Deck", rarity: "SR", cardNumber: "ST01-012", imageUrl: "/cards/st01-012.svg" },
    { id: "st10-001", name: "Trafalgar Law", set: "Three Captains Starter Deck", rarity: "L", cardNumber: "ST10-001", imageUrl: "/cards/st10-001.svg" },
    { id: "eb01-001", name: "Hannyabal", set: "Extra Booster Memorial Collection", rarity: "L", cardNumber: "EB01-001", imageUrl: "/cards/eb01-001.svg" },
    { id: "op07-001", name: "Monkey.D.Dragon", set: "500 Years into the Future", rarity: "L", cardNumber: "OP07-001", imageUrl: "/cards/op07-001.svg" },
    { id: "op07-109", name: "Boa Hancock", set: "500 Years into the Future", rarity: "SR", cardNumber: "OP07-109", imageUrl: "/cards/op07-109.svg" },
    { id: "op08-001", name: "Tony Tony Chopper", set: "Two Legends", rarity: "L", cardNumber: "OP08-001", imageUrl: "/cards/op08-001.svg" },
    { id: "op08-118", name: "Silvers Rayleigh", set: "Two Legends", rarity: "SEC", cardNumber: "OP08-118", imageUrl: "/cards/op08-118.svg" }
];


export const INITIAL_PRICING: PricingSnapshot[] = INITIAL_CARD_PROFILES.map(card => ({
    cardProfileId: card.id,
    rawPrice: Math.floor(Math.random() * 50) + 5,
    sealedPrice: card.rarity === 'SEC' ? Math.floor(Math.random() * 200) + 150 : null,
    updatedAt: new Date().toISOString(),
    source: Math.random() > 0.5 ? "Mock:eBay" : "Mock:TCGPlayer"
}));

export const INITIAL_SELLER_PROFILE: SellerProfile = {
    handle: "nami-treasures",
    shopName: "Nami's Treasure Shop",
    isActive: true,
    locationCountry: "Singapore",
    locationCity: "Singapore City",
    paymentsAccepted: ["PayNow", "Cash", "PayPal"],
    meetupsEnabled: true,
    shippingEnabled: true,
    socials: {
        instagram: "namitreasure",
        discord: "nami#1234"
    },
    wishlistText: "Always looking for Mint OP-01 Manga Shanks and Alt Art Leaders!"
};

export const INITIAL_INVENTORY: InventoryItem[] = [
    // 10 RAW items
    ...INITIAL_CARD_PROFILES.slice(0, 10).map((card, i) => ({
        id: `inv-raw-${i}`,
        cardProfileId: card.id,
        itemType: "RAW" as const,
        quantity: 1,
        stage: (i % 3 === 0 ? "UNGRADED_FOR_SALE" : i % 2 === 0 ? "ACQUIRED" : "IN_STOCK_UNGRADED") as any,
        listingPrice: (i % 3 === 0 ? Math.floor(Math.random() * 60) + 10 : null),
        acquisitionPrice: Math.floor(Math.random() * 30) + 5,
        photos: {},
        createdAt: new Date().toISOString()
    })),
    // 5 GRADED items
    ...INITIAL_CARD_PROFILES.slice(10, 15).map((card, i) => ({
        id: `inv-graded-${i}`,
        cardProfileId: card.id,
        itemType: "GRADED" as const,
        gradeProvider: "PSA" as const,
        gradeValue: 10,
        quantity: 1,
        stage: "GRADED_FOR_SALE" as any,
        listingPrice: Math.floor(Math.random() * 500) + 100,
        acquisitionPrice: Math.floor(Math.random() * 100) + 50,
        photos: {},
        createdAt: new Date().toISOString()
    })),
    // 3 SEALED products
    ...INITIAL_CARD_PROFILES.slice(15, 18).map((card, i) => ({
        id: `inv-sealed-${i}`,
        cardProfileId: card.id,
        itemType: "SEALED" as const,
        quantity: i === 0 ? 5 : 1,
        stage: "UNGRADED_FOR_SALE" as any,
        listingPrice: Math.floor(Math.random() * 300) + 150,
        acquisitionPrice: Math.floor(Math.random() * 120) + 80,
        photos: {},
        createdAt: new Date().toISOString()
    }))
];

export const SEED_DATA: AppState = {
    sellerProfile: INITIAL_SELLER_PROFILE,
    cardProfiles: INITIAL_CARD_PROFILES,
    pricingSnapshots: INITIAL_PRICING,
    inventoryItems: INITIAL_INVENTORY
};
