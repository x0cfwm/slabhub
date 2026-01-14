import { AppState } from "./types";
import { SEED_DATA } from "./seed";

const STORAGE_KEY = "opcrm_v2";

export function loadState(): AppState {
    if (typeof window === "undefined") return SEED_DATA;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        saveState(SEED_DATA);
        return SEED_DATA;
    }

    try {
        return JSON.parse(saved);
    } catch (e) {
        console.error("Failed to parse state", e);
        return SEED_DATA;
    }
}

export function saveState(state: AppState) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetToSeed(): AppState {
    saveState(SEED_DATA);
    return SEED_DATA;
}
