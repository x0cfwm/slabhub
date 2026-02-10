
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const adminUser = await prisma.user.findFirst({
        where: { email: 'admin@example.com' }
    });

    if (!adminUser) {
        console.log('Admin user not found');
        return;
    }

    const items = await prisma.inventoryItem.findMany({
        where: { userId: adminUser.id },
        select: {
            id: true,
            userId: true,
            itemType: true,
            productName: true,
            stage: true,
        }
    });
    console.log(`Items for admin@example.com (${adminUser.id}):`);
    console.log(JSON.stringify(items, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
