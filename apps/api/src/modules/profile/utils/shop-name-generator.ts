/**
 * Generates friendly, pronounceable shop-name suggestions for new users.
 * Format: "Adjective-Animal" (e.g. "Awesome-Duck").
 *
 * Mirrors the client-side generator so API-seeded names feel the same as
 * anything the web app might still generate on the fly.
 */

import type { PrismaService } from '../../prisma/prisma.service';

const ADJECTIVES = [
    'Awesome', 'Brave', 'Bright', 'Clever', 'Cosmic', 'Crimson', 'Dapper',
    'Dazzling', 'Eager', 'Electric', 'Epic', 'Fearless', 'Fierce', 'Frosty',
    'Gentle', 'Glowing', 'Golden', 'Grand', 'Happy', 'Heroic', 'Jolly',
    'Lively', 'Lucky', 'Majestic', 'Mighty', 'Noble', 'Nimble', 'Playful',
    'Polished', 'Prime', 'Quick', 'Quiet', 'Radiant', 'Rapid', 'Royal',
    'Savvy', 'Shiny', 'Silent', 'Silver', 'Sleek', 'Smooth', 'Snappy',
    'Sonic', 'Stellar', 'Stormy', 'Sunny', 'Swift', 'Turbo', 'Vivid', 'Zesty',
];

const ANIMALS = [
    'Badger', 'Bear', 'Beaver', 'Bison', 'Bobcat', 'Cheetah', 'Cobra',
    'Crane', 'Crow', 'Deer', 'Dolphin', 'Dragon', 'Duck', 'Eagle', 'Falcon',
    'Ferret', 'Finch', 'Fox', 'Gecko', 'Goose', 'Hawk', 'Heron', 'Horse',
    'Hyena', 'Jaguar', 'Koala', 'Lemur', 'Leopard', 'Lion', 'Lynx', 'Moose',
    'Ocelot', 'Octopus', 'Orca', 'Otter', 'Owl', 'Panda', 'Panther',
    'Penguin', 'Puma', 'Rabbit', 'Raccoon', 'Raven', 'Seal', 'Shark',
    'Sparrow', 'Stag', 'Swan', 'Tiger', 'Walrus', 'Whale', 'Wolf', 'Wombat',
];

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateShopName(): string {
    return `${pick(ADJECTIVES)}-${pick(ANIMALS)}`;
}

export function toHandle(shopName: string): string {
    return shopName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

/**
 * Creates a SellerProfile for the given user with a generated shop name and a
 * unique handle. Retries handle generation on collisions.
 *
 * If a profile already exists for the user, it is returned unchanged — making
 * this safe to call defensively on login or first profile fetch.
 */
export async function ensureSellerProfile(
    prisma: PrismaService,
    userId: string,
) {
    const existing = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) {return existing;}

    const MAX_ATTEMPTS = 12;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const shopName = generateShopName();
        const baseHandle = toHandle(shopName);
        // After a couple of collisions, append a numeric suffix to escape
        // the combinatorial space quickly.
        const handle = attempt < 3
            ? baseHandle
            : `${baseHandle}-${Math.floor(Math.random() * 10000)}`;

        const handleTaken = await prisma.sellerProfile.findUnique({ where: { handle } });
        if (handleTaken) {continue;}

        try {
            return await prisma.sellerProfile.create({
                data: {
                    userId,
                    handle,
                    shopName,
                    isActive: false,
                    location: '',
                    shippingEnabled: false,
                },
            });
        } catch (err: any) {
            // Race: another request created the profile / grabbed the handle.
            // Re-check for an existing profile before retrying.
            const now = await prisma.sellerProfile.findUnique({ where: { userId } });
            if (now) {return now;}
            // Unique constraint on handle — loop and try a fresh name.
            if (err?.code === 'P2002') {continue;}
            throw err;
        }
    }

    throw new Error(`Failed to allocate a unique shop handle for user ${userId}`);
}
