import { PrismaClient } from '@prisma/client';

let prismaSingleton: PrismaClient | null = null;

export function getTestDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL_TEST ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres_password@127.0.0.1:5432/slabhub_test?schema=public'
  );
}

export function getPrisma(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
    });
  }

  return prismaSingleton;
}

export async function disconnectPrisma() {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
}

export async function truncateAllTables(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     AND tablename <> '_prisma_migrations'`,
  );

  const tableNames = rows.map((r) => `"public"."${r.tablename}"`);
  if (tableNames.length === 0) return;

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE;`);
}
