
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'n.obukhov.work@gmail.com' }
    });

    if (user) {
        const items = await prisma.inventoryItem.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                productName: true,
                condition: true,
                stage: true,
                itemType: true
            }
        });
        console.log('Inventory Items for n.obukhov.work@gmail.com:');
        console.log(JSON.stringify(items, null, 2));
    } else {
        console.log('User not found');
    }

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
