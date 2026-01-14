import { AppState, CardProfile, InventoryItem, PricingSnapshot, SellerProfile } from "./types";
import { loadState, saveState, resetToSeed } from "./storage";

const LATENCY_MIN = 0;
const LATENCY_MAX = 100;
const FAILURE_RATE = 0;

async function wait() {
    const ms = Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN)) + LATENCY_MIN;
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail() {
    if (Math.random() < FAILURE_RATE) {
        throw new Error("Mock API Failure: Random error occurred");
    }
}

export const mockApi = {
    async getCurrentUser(): Promise<SellerProfile | null> {
        await wait();
        maybeFail();
        return loadState().sellerProfile;
    },

    async updateProfile(patch: Partial<SellerProfile>): Promise<SellerProfile> {
        await wait();
        maybeFail();
        const state = loadState();
        if (!state.sellerProfile) {
            state.sellerProfile = {
                handle: "",
                shopName: "",
                isActive: true,
                locationCountry: "",
                locationCity: "",
                paymentsAccepted: [],
                meetupsEnabled: false,
                shippingEnabled: false,
                socials: {},
                wishlistText: ""
            };
        }
        state.sellerProfile = { ...state.sellerProfile, ...patch };
        saveState(state);
        return state.sellerProfile;
    },

    async listCardProfiles(query?: string): Promise<CardProfile[]> {
        await wait();
        maybeFail();
        const profiles = loadState().cardProfiles;
        if (!query) return profiles;
        const q = query.toLowerCase();
        return profiles.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.cardNumber.toLowerCase().includes(q) ||
            p.set.toLowerCase().includes(q)
        );
    },

    async getCardProfile(id: string): Promise<CardProfile | undefined> {
        await wait();
        maybeFail();
        return loadState().cardProfiles.find(p => p.id === id);
    },

    async listInventory(): Promise<InventoryItem[]> {
        await wait();
        maybeFail();
        return loadState().inventoryItems;
    },

    async createInventoryItem(item: Omit<InventoryItem, "id" | "createdAt">): Promise<InventoryItem> {
        await wait();
        maybeFail();
        const state = loadState();
        const newItem: InventoryItem = {
            ...item,
            id: `inv-${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        state.inventoryItems.push(newItem);
        saveState(state);
        return newItem;
    },

    async updateInventoryItem(id: string, patch: Partial<InventoryItem>): Promise<InventoryItem> {
        await wait();
        maybeFail();
        const state = loadState();
        const idx = state.inventoryItems.findIndex(i => i.id === id);
        if (idx === -1) throw new Error("Item not found");
        state.inventoryItems[idx] = { ...state.inventoryItems[idx], ...patch };
        saveState(state);
        return state.inventoryItems[idx];
    },

    async deleteInventoryItem(id: string): Promise<void> {
        await wait();
        maybeFail();
        const state = loadState();
        state.inventoryItems = state.inventoryItems.filter(i => i.id !== id);
        saveState(state);
    },

    async listPricing(): Promise<PricingSnapshot[]> {
        await wait();
        maybeFail();
        return loadState().pricingSnapshots;
    },

    async refreshPricing(): Promise<PricingSnapshot[]> {
        await wait();
        maybeFail();
        const state = loadState();
        state.pricingSnapshots = state.pricingSnapshots.map(s => ({
            ...s,
            rawPrice: Math.max(1, s.rawPrice + (Math.random() * 10 - 5)),
            sealedPrice: s.sealedPrice ? Math.max(1, s.sealedPrice + (Math.random() * 20 - 10)) : null,
            updatedAt: new Date().toISOString()
        }));
        saveState(state);
        return state.pricingSnapshots;
    },

    async resetData(): Promise<AppState> {
        await wait();
        return resetToSeed();
    }
};
