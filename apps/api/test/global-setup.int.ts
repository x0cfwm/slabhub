import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { getPrisma, truncateAllTables, disconnectPrisma } from './helpers/prisma-test';

function normalizeDbUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  if (parsed.hostname === 'localhost') {
    parsed.hostname = '127.0.0.1';
  }
  return parsed.toString();
}

function getDatabaseName(dbUrl: string): string {
  const parsed = new URL(dbUrl);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
}

async function ensureDatabaseExists(dbUrl: string) {
  const dbName = getDatabaseName(dbUrl);
  if (!dbName) return;

  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  const adminPrisma = new PrismaClient({
    datasources: {
      db: { url: adminUrl.toString() },
    },
  });

  const escapedDbNameForSql = dbName.replace(/'/g, "''");
  const escapedDbNameForIdentifier = dbName.replace(/"/g, '""');

  try {
    await adminPrisma.$connect();
    const rows = await adminPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${escapedDbNameForSql}') AS "exists"`,
    );
    if (!rows[0]?.exists) {
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${escapedDbNameForIdentifier}"`);
    }
  } finally {
    await adminPrisma.$disconnect();
  }
}

export default async function globalSetup() {
  const fallbackDb = 'postgresql://postgres:postgres_password@127.0.0.1:5432/slabhub_test?schema=public';
  const rawDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || fallbackDb;
  const dbUrl = normalizeDbUrl(rawDbUrl);

  process.env.DATABASE_URL_TEST = dbUrl;
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = dbUrl;
  }

  await ensureDatabaseExists(dbUrl);

  try {
    execSync('pnpm exec prisma migrate deploy --schema ../../prisma/schema.prisma', {
      cwd: __dirname + '/..',
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    });
  } catch {
    // Fallback for local test DB bootstrap when migrations table is absent.
    execSync('pnpm exec prisma db push --schema ../../prisma/schema.prisma', {
      cwd: __dirname + '/..',
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    });
  }

  const prisma = getPrisma();
  await prisma.$connect();
  await truncateAllTables(prisma);
  await disconnectPrisma();
}
