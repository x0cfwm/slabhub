/**
 * Generates friendly, pronounceable shop-name suggestions for new users.
 * Format: "Adjective-Animal" (e.g. "Awesome-Duck").
 */

const ADJECTIVES = [
    "Awesome", "Brave", "Bright", "Clever", "Cosmic", "Crimson", "Dapper",
    "Dazzling", "Eager", "Electric", "Epic", "Fearless", "Fierce", "Frosty",
    "Gentle", "Glowing", "Golden", "Grand", "Happy", "Heroic", "Jolly",
    "Lively", "Lucky", "Majestic", "Mighty", "Noble", "Nimble", "Playful",
    "Polished", "Prime", "Quick", "Quiet", "Radiant", "Rapid", "Royal",
    "Savvy", "Shiny", "Silent", "Silver", "Sleek", "Smooth", "Snappy",
    "Sonic", "Stellar", "Stormy", "Sunny", "Swift", "Turbo", "Vivid", "Zesty"
];

const ANIMALS = [
    "Badger", "Bear", "Beaver", "Bison", "Bobcat", "Cheetah", "Cobra",
    "Crane", "Crow", "Deer", "Dolphin", "Dragon", "Duck", "Eagle", "Falcon",
    "Ferret", "Finch", "Fox", "Gecko", "Goose", "Hawk", "Heron", "Horse",
    "Hyena", "Jaguar", "Koala", "Lemur", "Leopard", "Lion", "Lynx", "Moose",
    "Ocelot", "Octopus", "Orca", "Otter", "Owl", "Panda", "Panther",
    "Penguin", "Puma", "Rabbit", "Raccoon", "Raven", "Seal", "Shark",
    "Sparrow", "Stag", "Swan", "Tiger", "Walrus", "Whale", "Wolf", "Wombat"
];

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a shop-name suggestion like "Awesome-Duck".
 */
export function generateShopName(): string {
    return `${pick(ADJECTIVES)}-${pick(ANIMALS)}`;
}

/**
 * Converts any shop name into a valid handle: lowercase, alphanumeric + hyphens.
 */
export function toHandle(shopName: string): string {
    return shopName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}
