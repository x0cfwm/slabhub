
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.inventoryItem.findMany({
        take: 10,
        select: {
            id: true,
            userId: true,
            itemType: true,
            productName: true,
            stage: true,
        }
    });
    console.log(JSON.stringify(items, null, 2));

    const users = await prisma.user.findMany({
        take: 5,
        include: {
            sellerProfile: true
        }
    });
    console.log('Users:');
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
