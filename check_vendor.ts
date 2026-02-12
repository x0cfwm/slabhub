import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const handle = 'jesus-shop';
    const seller = await prisma.sellerProfile.findUnique({
        where: { handle },
    });

    if (!seller) {
        console.log('Seller not found');
        return;
    }

    console.log('Seller:', {
        id: seller.id,
        userId: seller.userId,
        handle: seller.handle,
        shopName: seller.shopName
    });

    const items = await prisma.inventoryItem.findMany({
        where: {
            OR: [
                { sellerId: seller.id },
                ...(seller.userId ? [{ userId: seller.userId }] : []),
            ]
        }
    });

    console.log(`Total items for this seller/user: ${items.length}`);
    console.log('Stages present:', [...new Set(items.map(i => i.stage))]);

    const listedItems = items.filter(i => i.stage === 'LISTED');
    console.log(`Listed items: ${listedItems.length}`);

    await prisma.$disconnect();
}

check();
