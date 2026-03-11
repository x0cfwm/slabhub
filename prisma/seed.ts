import { PrismaClient, VariantType, Language, ItemType, InventoryStage, GradeProvider, Condition, ProductType, SealedIntegrity } from '@prisma/client';

const prisma = new PrismaClient();

// One Piece TCG Card Profiles - 30 cards
const CARD_PROFILES = [
    { id: 'op01-001', name: 'Monkey.D.Luffy', set: 'Romance Dawn', rarity: 'L', cardNumber: 'OP01-001', imageUrl: '/cards/op01-001.svg' },
    { id: 'op01-016', name: 'Nami', set: 'Romance Dawn', rarity: 'R', cardNumber: 'OP01-016', imageUrl: '/cards/op01-016.svg' },
    { id: 'op01-024', name: 'Kozuki Momonosuke', set: 'Romance Dawn', rarity: 'UC', cardNumber: 'OP01-024', imageUrl: '/cards/op01-024.svg' },
    { id: 'op01-047', name: 'Trafalgar Law', set: 'Romance Dawn', rarity: 'SR', cardNumber: 'OP01-047', imageUrl: '/cards/op01-047.svg' },
    { id: 'op01-070', name: 'Dracule Mihawk', set: 'Romance Dawn', rarity: 'SR', cardNumber: 'OP01-070', imageUrl: '/cards/op01-070.svg' },
    { id: 'op01-120', name: 'Shanks', set: 'Romance Dawn', rarity: 'SEC', cardNumber: 'OP01-120', imageUrl: '/cards/op01-120.svg' },
    { id: 'op02-001', name: 'Edward.Newgate', set: 'Paramount War', rarity: 'L', cardNumber: 'OP02-001', imageUrl: '/cards/op02-001.svg' },
    { id: 'op02-013', name: 'Portgas.D.Ace', set: 'Paramount War', rarity: 'SR', cardNumber: 'OP02-013', imageUrl: '/cards/op02-013.svg' },
    { id: 'op02-036', name: 'Nami', set: 'Paramount War', rarity: 'SR', cardNumber: 'OP02-036', imageUrl: '/cards/op02-036.svg' },
    { id: 'op02-121', name: 'Kuzan', set: 'Paramount War', rarity: 'SEC', cardNumber: 'OP02-121', imageUrl: '/cards/op02-121.svg' },
    { id: 'op03-001', name: 'Portgas.D.Ace', set: 'Pillars of Strength', rarity: 'L', cardNumber: 'OP03-001', imageUrl: '/cards/op03-001.svg' },
    { id: 'op03-022', name: 'Arlong', set: 'Pillars of Strength', rarity: 'L', cardNumber: 'OP03-022', imageUrl: '/cards/op03-022.svg' },
    { id: 'op03-122', name: 'Sogeking', set: 'Pillars of Strength', rarity: 'SEC', cardNumber: 'OP03-122', imageUrl: '/cards/op03-122.svg' },
    { id: 'op04-001', name: 'Donquixote Doflamingo', set: 'Kingdoms of Intrigue', rarity: 'L', cardNumber: 'OP04-001', imageUrl: '/cards/op04-001.svg' },
    { id: 'op04-083', name: 'Rebecca', set: 'Kingdoms of Intrigue', rarity: 'L', cardNumber: 'OP04-083', imageUrl: '/cards/op04-083.svg' },
    { id: 'op05-001', name: 'Sabo', set: 'Awakening of the New Era', rarity: 'L', cardNumber: 'OP05-001', imageUrl: '/cards/op05-001.svg' },
    { id: 'op05-060', name: 'Monkey.D.Luffy', set: 'Awakening of the New Era', rarity: 'L', cardNumber: 'OP05-060', imageUrl: '/cards/op05-060.svg' },
    { id: 'op05-118', name: 'Kaido', set: 'Awakening of the New Era', rarity: 'SEC', cardNumber: 'OP05-118', imageUrl: '/cards/op05-118.svg' },
    { id: 'op05-119', name: 'Monkey.D.Luffy', set: 'Awakening of the New Era', rarity: 'SEC', cardNumber: 'OP05-119', imageUrl: '/cards/op05-119.svg' },
    { id: 'op06-001', name: 'Uta', set: 'Wings of the Captain', rarity: 'L', cardNumber: 'OP06-001', imageUrl: '/cards/op06-001.svg' },
    { id: 'op06-022', name: 'Yamato', set: 'Wings of the Captain', rarity: 'L', cardNumber: 'OP06-022', imageUrl: '/cards/op06-022.svg' },
    { id: 'op06-086', name: 'Gecko Moria', set: 'Wings of the Captain', rarity: 'SR', cardNumber: 'OP06-086', imageUrl: '/cards/op06-086.svg' },
    { id: 'st01-001', name: 'Monkey.D.Luffy', set: 'Straw Hat Crew Starter Deck', rarity: 'L', cardNumber: 'ST01-001', imageUrl: '/cards/st01-001.svg' },
    { id: 'st01-012', name: 'Roronoa Zoro', set: 'Straw Hat Crew Starter Deck', rarity: 'SR', cardNumber: 'ST01-012', imageUrl: '/cards/st01-012.svg' },
    { id: 'st10-001', name: 'Trafalgar Law', set: 'Three Captains Starter Deck', rarity: 'L', cardNumber: 'ST10-001', imageUrl: '/cards/st10-001.svg' },
    { id: 'eb01-001', name: 'Hannyabal', set: 'Extra Booster Memorial Collection', rarity: 'L', cardNumber: 'EB01-001', imageUrl: '/cards/eb01-001.svg' },
    { id: 'op07-001', name: 'Monkey.D.Dragon', set: '500 Years into the Future', rarity: 'L', cardNumber: 'OP07-001', imageUrl: '/cards/op07-001.svg' },
    { id: 'op07-109', name: 'Boa Hancock', set: '500 Years into the Future', rarity: 'SR', cardNumber: 'OP07-109', imageUrl: '/cards/op07-109.svg' },
    { id: 'op08-001', name: 'Tony Tony Chopper', set: 'Two Legends', rarity: 'L', cardNumber: 'OP08-001', imageUrl: '/cards/op08-001.svg' },
    { id: 'op08-118', name: 'Silvers Rayleigh', set: 'Two Legends', rarity: 'SEC', cardNumber: 'OP08-118', imageUrl: '/cards/op08-118.svg' },
];

async function main() {
    console.log('🌱 Starting seed...');

    // 0. Upsert demo user
    console.log('👤 Upserting demo user...');
    const user = await prisma.user.upsert({
        where: { email: 'n.obukhov.work@gmail.com' },
        update: {},
        create: {
            email: 'n.obukhov.work@gmail.com',
        },
    });
    console.log(`✅ User: ${user.email} (${user.id})`);

    // 1. Upsert demo seller profile
    console.log('📝 Upserting seller profile...');
    const seller = await prisma.sellerProfile.upsert({
        where: { handle: 'nami-treasures' },
        update: {
            userId: user.id,
        },
        create: {
            handle: 'nami-treasures',
            shopName: "Nami's Treasure Shop",
            isActive: true,
            location: 'Singapore, Singapore',
            paymentsAccepted: ['PayNow', 'Cash', 'PayPal'],
            meetupsEnabled: true,
            shippingEnabled: true,
            fulfillmentOptions: ['shipping', 'meetups_local'],
            userId: user.id,
            socials: {
                instagram: 'namitreasure',
                discord: 'nami#1234',
            },
            wishlistText: 'Always looking for Mint OP-01 Manga Shanks and Alt Art Leaders!',
        },
    });
    console.log(`✅ Seller: ${seller.shopName} (${seller.handle})`);

    // 2. Upsert card profiles
    console.log('🃏 Upserting card profiles...');
    for (const card of CARD_PROFILES) {
        await prisma.cardProfile.upsert({
            where: { id: card.id },
            update: {
                name: card.name,
                set: card.set,
                rarity: card.rarity,
                cardNumber: card.cardNumber,
                imageUrl: card.imageUrl,
            },
            create: card,
        });
    }
    console.log(`✅ Created/updated ${CARD_PROFILES.length} card profiles`);

    // 3. Create card variants for each card (NORMAL JP, NORMAL EN, PARALLEL_FOIL JP)
    console.log('🎴 Creating card variants...');
    const variantConfigs: { variantType: VariantType; language: Language }[] = [
        { variantType: 'NORMAL', language: 'JP' },
        { variantType: 'NORMAL', language: 'EN' },
        { variantType: 'PARALLEL_FOIL', language: 'JP' },
    ];

    const createdVariants: { id: string; cardId: string }[] = [];

    for (const card of CARD_PROFILES) {
        for (const vc of variantConfigs) {
            const variant = await prisma.cardVariant.upsert({
                where: {
                    cardId_variantType_language: {
                        cardId: card.id,
                        variantType: vc.variantType,
                        language: vc.language,
                    },
                },
                update: {},
                create: {
                    cardId: card.id,
                    variantType: vc.variantType,
                    language: vc.language,
                    imageUrl: card.imageUrl,
                    name: card.name,
                    setName: card.set,
                    setNumber: card.cardNumber,
                },
            });
            createdVariants.push({ id: variant.id, cardId: variant.cardId });
        }
    }
    console.log(`✅ Created/updated ${createdVariants.length} card variants`);

    // 4. Upsert pricing snapshots for all cards
    console.log('💰 Upserting pricing snapshots...');
    for (const card of CARD_PROFILES) {
        const basePrice = Math.floor(Math.random() * 50) + 5;
        const isSec = card.rarity === 'SEC';

        await prisma.pricingSnapshot.upsert({
            where: { cardProfileId: card.id },
            update: {
                rawPrice: basePrice,
                sealedPrice: isSec ? Math.floor(Math.random() * 200) + 150 : null,
                source: Math.random() > 0.5 ? 'Mock:eBay' : 'Mock:TCGPlayer',
            },
            create: {
                cardProfileId: card.id,
                rawPrice: basePrice,
                sealedPrice: isSec ? Math.floor(Math.random() * 200) + 150 : null,
                source: Math.random() > 0.5 ? 'Mock:eBay' : 'Mock:TCGPlayer',
            },
        });
    }
    console.log(`✅ Created/updated ${CARD_PROFILES.length} pricing snapshots`);

    // 5. Delete existing inventory items for clean seed
    console.log('🗑️ Cleaning existing inventory items...');
    await prisma.inventoryItem.deleteMany({
        where: { sellerId: seller.id },
    });

    // 6. Create inventory items
    console.log('📦 Creating inventory items...');

    const stages: InventoryStage[] = ['ACQUIRED', 'IN_TRANSIT', 'BEING_GRADED', 'IN_STOCK', 'LISTED'];
    const conditions: Condition[] = ['NM', 'LP', 'MP'];

    // Get JP NORMAL variants for inventory
    const jpNormalVariants = await prisma.cardVariant.findMany({
        where: { variantType: 'NORMAL', language: 'JP' },
        take: 15,
    });

    // 10 RAW items
    for (let i = 0; i < 10; i++) {
        const variant = jpNormalVariants[i % jpNormalVariants.length];
        await prisma.inventoryItem.create({
            data: {
                userId: user.id,
                sellerId: seller.id,
                itemType: ItemType.SINGLE_CARD_RAW,
                cardVariantId: variant.id,
                condition: conditions[i % 3],
                quantity: i === 0 ? 12 : 1,
                stage: stages[i % stages.length],
                acquisitionPrice: 5 + i,
                listingPrice: i % 3 === 0 ? (5 + i) * 1.3 : null,
                acquisitionDate: new Date('2024-01-01'),
                notes: i === 0 ? 'Bulk purchase from local seller' : null,
            },
        });
    }
    console.log('✅ Created 10 RAW inventory items');

    // Get EN ALTERNATE_ART variants or fallback to EN NORMAL
    const enVariants = await prisma.cardVariant.findMany({
        where: { language: 'EN' },
        take: 5,
    });

    // 5 GRADED items
    for (let i = 0; i < 5; i++) {
        const variant = enVariants[i % enVariants.length];
        const gradeProviders: GradeProvider[] = ['PSA', 'BGS', 'CGC'];

        await prisma.inventoryItem.create({
            data: {
                userId: user.id,
                sellerId: seller.id,
                itemType: ItemType.SINGLE_CARD_GRADED,
                cardVariantId: variant.id,
                gradeProvider: gradeProviders[i % 3],
                gradeValue: i === 0 ? '10' : i === 1 ? '9.5' : '9',
                certNumber: `CERT-9900${i}`,
                gradingCost: 25,
                slabImages: {},
                quantity: 1,
                stage: i < 2 ? 'LISTED' : stages[i % stages.length],
                acquisitionPrice: 150 + i * 50,
                listingPrice: i < 2 ? (150 + i * 50) * 1.5 : null,
                acquisitionDate: new Date('2024-02-01'),
            },
        });
    }
    console.log('✅ Created 5 GRADED inventory items');

    // 3 SEALED products
    const sealedProducts = [
        {
            productName: 'Romance Dawn Booster Box',
            productType: ProductType.BOOSTER_BOX,
            language: 'JP',
            integrity: SealedIntegrity.MINT,
            quantity: 2,
            acquisitionPrice: 120,
            stage: 'IN_STOCK' as InventoryStage,
            configuration: {
                containsBoosters: true,
                packsPerUnit: 24,
                containsFixedCards: false,
                containsPromo: false,
            },
        },
        {
            productName: 'Monkey.D.Luffy Illustration Box',
            productType: ProductType.ILLUSTRATION_BOX,
            language: 'EN',
            integrity: SealedIntegrity.MINOR_DENTS,
            quantity: 1,
            acquisitionPrice: 45,
            stage: 'LISTED' as InventoryStage,
            listingPrice: 65,
            configuration: {
                containsBoosters: true,
                packsPerUnit: 10,
                containsFixedCards: true,
                containsPromo: true,
            },
        },
        {
            productName: 'Paramount War Starter Deck',
            productType: ProductType.STARTER_DECK,
            language: 'JP',
            integrity: SealedIntegrity.MINT,
            quantity: 4,
            acquisitionPrice: 15,
            stage: 'LISTED' as InventoryStage,
            listingPrice: 22,
            configuration: {
                containsBoosters: false,
                containsFixedCards: true,
                containsPromo: false,
            },
        },
    ];

    for (const product of sealedProducts) {
        await prisma.inventoryItem.create({
            data: {
                userId: user.id,
                sellerId: seller.id,
                itemType: ItemType.SEALED_PRODUCT,
                productName: product.productName,
                productType: product.productType,
                language: product.language,
                integrity: product.integrity,
                quantity: product.quantity,
                stage: product.stage,
                acquisitionPrice: product.acquisitionPrice,
                listingPrice: product.listingPrice || null,
                acquisitionDate: new Date('2023-12-15'),
                configuration: product.configuration,
            },
        });
    }
    // 7. Seed some RefProducts for Market Pricing
    console.log('🛒 Seeding RefProducts...');
    const refProducts = [
        {
            externalId: 'prod-1',
            name: 'Monkey.D.Luffy (Parallel)',
            number: 'OP01-001',
            imageUrl: '/cards/op01-001.svg',
            priceChartingUrl: 'https://www.pricecharting.com/game/pokemon-promo/pikachu-on-the-ball-001',
            tcgplayerId: '1001'
        },
        {
            externalId: 'prod-2',
            name: 'Nami (Alternate Art)',
            number: 'OP01-016',
            imageUrl: '/cards/op01-016.svg',
            priceChartingUrl: 'https://www.pricecharting.com/game/pokemon-jungle/pikachu-60',
            tcgplayerId: '1002'
        },
        {
            externalId: 'prod-3',
            name: 'Shanks (Manga Art)',
            number: 'OP01-120',
            imageUrl: '/cards/op01-120.svg',
            priceChartingUrl: 'https://www.pricecharting.com/game/pokemon-base-set/charizard-4',
            tcgplayerId: '1003'
        },
        {
            externalId: 'prod-4',
            name: 'Trafalgar Law',
            number: 'OP01-047',
            imageUrl: '/cards/op01-047.svg',
            priceChartingUrl: null,
            tcgplayerId: '1004'
        }
    ];

    for (const prod of refProducts) {
        const { priceChartingUrl, ...rest } = prod;
        await prisma.refProduct.upsert({
            where: { externalId: prod.externalId },
            update: {
                tcgplayerId: prod.tcgplayerId
            },
            create: rest
        });

        if (priceChartingUrl && prod.tcgplayerId) {
            const tcgId = parseInt(prod.tcgplayerId);
            await prisma.refPriceChartingProduct.upsert({
                where: { productUrl: priceChartingUrl },
                update: { tcgPlayerId: tcgId },
                create: {
                    productUrl: priceChartingUrl,
                    tcgPlayerId: tcgId,
                    details: {}
                }
            });
        }
    }
    console.log(`✅ Seeded ${refProducts.length} RefProducts`);

    // Summary
    const totalItems = await prisma.inventoryItem.count({
        where: { sellerId: seller.id },
    });
    console.log(`\n🎉 Seed complete!`);
    console.log(`   - 1 Seller Profile`);
    console.log(`   - ${CARD_PROFILES.length} Card Profiles`);
    console.log(`   - ${createdVariants.length} Card Variants`);
    console.log(`   - ${CARD_PROFILES.length} Pricing Snapshots`);
    console.log(`   - ${totalItems} Inventory Items (10 RAW, 5 GRADED, 3 SEALED)`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
