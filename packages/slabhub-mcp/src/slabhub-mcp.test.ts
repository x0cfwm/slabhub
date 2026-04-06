import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, beforeEach, test } from 'node:test';
import {
  GradeProvider,
  InventoryStage,
  ItemType,
  PrismaClient,
  ProductType,
  ShopEventType,
} from '@prisma/client';
import { resolveSessionContext } from './auth.js';
import { SlabhubAnalyticsService } from './analytics.js';
import type { SlabhubMcpEnv } from './env.js';
import { SlabhubInventoryService } from './inventory.js';

const require = createRequire(import.meta.url);
const fixtures = require('../../../apps/api/test/helpers/fixtures.ts') as typeof import('../../../apps/api/test/helpers/fixtures.ts');
const prismaTestHelpers = require('../../../apps/api/test/helpers/prisma-test.ts') as typeof import('../../../apps/api/test/helpers/prisma-test.ts');

const prisma = prismaTestHelpers.getPrisma() as PrismaClient;

const env: SlabhubMcpEnv = {
  DATABASE_URL: process.env.DATABASE_URL!,
  SLABHUB_MCP_SESSION_TOKEN: 'unused-test-token',
  S3_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
  S3_BUCKET: 'test-bucket',
  S3_PUBLIC_BASE_URL: 'https://test-bucket.nyc3.digitaloceanspaces.com',
  S3_CDN_BASE_URL: 'https://test-bucket.nyc3.cdn.digitaloceanspaces.com',
  S3_FORCE_PATH_STYLE: false,
};

beforeEach(async () => {
  await prismaTestHelpers.truncateAllTables(prisma);
});

after(async () => {
  await prismaTestHelpers.disconnectPrisma();
});

test('resolveSessionContext accepts valid sessions and rejects expired ones', async () => {
  const user = await fixtures.createUser(prisma, 'auth@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'auth-seller');
  const { token } = await fixtures.createSession(prisma, user.id, 'auth-valid-token');

  const auth = await resolveSessionContext(prisma, token);
  assert.equal(auth.userId, user.id);
  assert.equal(auth.sellerId, seller.id);
  assert.equal(auth.sellerHandle, seller.handle);

  await prisma.session.create({
    data: {
      userId: user.id,
      sessionTokenHash: 'expired-token-hash',
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
    },
  });

  await assert.rejects(
    () => resolveSessionContext(prisma, 'expired-token-hash'),
    /does not match any session/,
  );

  const { createHash } = await import('node:crypto');
  const expiredToken = 'expired-real-token';
  await prisma.session.create({
    data: {
      userId: user.id,
      sessionTokenHash: createHash('sha256').update(expiredToken).digest('hex'),
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
    },
  });

  await assert.rejects(() => resolveSessionContext(prisma, expiredToken), /expired session/);
});

test('searchInventory matches name, set code, cert number, stage, and status name', async () => {
  const user = await fixtures.createUser(prisma, 'search@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'search-seller');
  const statuses = await fixtures.createWorkflowStatuses(prisma, user.id);
  const listedStatus = statuses.find((status) => status.systemId === 'LISTED');

  const set = await prisma.refPriceChartingSet.create({
    data: {
      name: 'One Piece OP01',
      code: 'OP01',
      slug: 'one-piece-op01',
    },
  });

  const product = await prisma.refPriceChartingProduct.create({
    data: {
      setId: set.id,
      productUrl: 'https://www.pricecharting.com/game/one-piece-op01/luffy-alt-art',
      title: 'Luffy Alt Art',
      cardNumber: 'OP01-001',
      rawPrice: 180,
      details: {},
    } as any,
  });

  await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      sellerId: seller.id,
      itemType: ItemType.SINGLE_CARD_GRADED,
      productName: 'Luffy Alt Art',
      refPriceChartingProductId: product.id,
      gradeProvider: GradeProvider.PSA,
      gradeValue: '10',
      certNumber: 'PSA-123',
      stage: InventoryStage.LISTED,
      statusId: listedStatus?.id,
    } as any,
  });

  const service = new SlabhubInventoryService(prisma, env);

  const bySetCode = await service.searchInventory(user.id, {
    query: 'OP01',
    limit: 20,
  });
  assert.equal(bySetCode.total, 1);

  const byCert = await service.searchInventory(user.id, {
    query: 'PSA-123',
    limit: 20,
  });
  assert.equal(byCert.total, 1);

  const byStatusName = await service.searchInventory(user.id, {
    query: 'Listed',
    limit: 20,
  });
  assert.equal(byStatusName.total, 1);

  const byStage = await service.searchInventory(user.id, {
    stage: InventoryStage.LISTED,
    itemType: ItemType.SINGLE_CARD_GRADED,
    limit: 20,
  });
  assert.equal(byStage.total, 1);
});

test('getItemDetails denies cross-user access', async () => {
  const owner = await fixtures.createUser(prisma, 'owner@test.com');
  const ownerSeller = await fixtures.createSeller(prisma, owner.id, 'owner-seller');
  const outsider = await fixtures.createUser(prisma, 'outsider@test.com');

  const item = await prisma.inventoryItem.create({
    data: {
      userId: owner.id,
      sellerId: ownerSeller.id,
      itemType: ItemType.SEALED_PRODUCT,
      productName: 'Romance Dawn Booster Box',
      productType: ProductType.BOOSTER_BOX,
      stage: InventoryStage.ACQUIRED,
    } as any,
  });

  const service = new SlabhubInventoryService(prisma, env);

  await assert.rejects(
    () => service.getItemDetails(outsider.id, { itemId: item.id }),
    /not found/,
  );
});

test('updateItemStatus maps SOLD stage to workflow status, writes history, and auto-fills soldDate', async () => {
  const user = await fixtures.createUser(prisma, 'status@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'status-seller');
  const statuses = await fixtures.createWorkflowStatuses(prisma, user.id);
  const listedStatus = statuses.find((status) => status.systemId === 'LISTED');
  const soldStatus = statuses.find((status) => status.systemId === 'SOLD');

  const item = await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      sellerId: seller.id,
      itemType: ItemType.SEALED_PRODUCT,
      productName: 'Paramount War Booster Box',
      productType: ProductType.BOOSTER_BOX,
      stage: InventoryStage.LISTED,
      statusId: listedStatus?.id,
      listingPrice: 220,
    } as any,
  });

  const service = new SlabhubInventoryService(prisma, env);
  const updated = await service.updateItemStatus(user.id, {
    itemId: item.id,
    stage: InventoryStage.SOLD,
    soldPrice: 240,
  });

  assert.equal(updated.stage, InventoryStage.SOLD);
  assert.equal(updated.status?.systemId, soldStatus?.systemId);
  assert.equal(updated.soldPrice, 240);
  assert.ok(updated.soldDate);

  const history = await prisma.inventoryHistory.findMany({
    where: {
      itemId: item.id,
      userId: user.id,
    },
  });
  assert.equal(history.length, 1);
  assert.equal(history[0]?.toStatusId, soldStatus?.id ?? null);
});

test('listActiveListings only returns LISTED items', async () => {
  const user = await fixtures.createUser(prisma, 'listings@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'listings-seller');

  await prisma.inventoryItem.createMany({
    data: [
      {
        userId: user.id,
        sellerId: seller.id,
        itemType: ItemType.SEALED_PRODUCT,
        productName: 'Listed Box',
        productType: ProductType.BOOSTER_BOX,
        stage: InventoryStage.LISTED,
        sortOrder: 0,
      },
      {
        userId: user.id,
        sellerId: seller.id,
        itemType: ItemType.SEALED_PRODUCT,
        productName: 'Sold Box',
        productType: ProductType.BOOSTER_BOX,
        stage: InventoryStage.SOLD,
        sortOrder: 1,
      },
    ] as any,
  });

  const service = new SlabhubInventoryService(prisma, env);
  const listings = await service.listActiveListings(user.id, { limit: 50 });

  assert.equal(listings.total, 1);
  assert.equal(listings.items[0]?.stage, InventoryStage.LISTED);
  assert.equal((listings.items[0] as any)?.productName, 'Listed Box');
});

test('getAnalyticsSummary handles empty and populated seller analytics', async () => {
  const noSellerUser = await fixtures.createUser(prisma, 'analytics-empty@test.com');
  const analytics = new SlabhubAnalyticsService(prisma);

  const empty = await analytics.getAnalyticsSummary(noSellerUser.id, 7);
  assert.equal(empty.summary.totalViews, 0);
  assert.equal(empty.views.length, 0);

  const user = await fixtures.createUser(prisma, 'analytics@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'analytics-seller');
  const item = await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      sellerId: seller.id,
      itemType: ItemType.SEALED_PRODUCT,
      productName: 'Traffic Box',
      productType: ProductType.BOOSTER_BOX,
      stage: InventoryStage.LISTED,
    } as any,
  });

  await (prisma as any).shopEvent.createMany({
    data: [
      {
        sellerProfileId: seller.id,
        type: ShopEventType.VIEW_SHOP,
        ipHash: 'hash-1',
        channel: 'discord',
        countryCode: 'US',
      },
      {
        sellerProfileId: seller.id,
        type: ShopEventType.VIEW_ITEM,
        itemId: item.id,
        ipHash: 'hash-1',
      },
      {
        sellerProfileId: seller.id,
        type: ShopEventType.INQUIRY_START,
        ipHash: 'hash-1',
      },
    ],
  });

  const summary = await analytics.getAnalyticsSummary(user.id, 7);
  assert.equal(summary.summary.totalViews, 1);
  assert.equal(summary.summary.inquiries, 1);
  assert.equal(summary.summary.uniqueVisitors, 1);
  assert.equal(summary.sources[0]?.name, 'Discord');
  assert.equal(summary.topItems[0]?.name, 'Traffic Box');
});

test('createInventoryItem enforces item validation and resolves default ACQUIRED workflow status', async () => {
  const user = await fixtures.createUser(prisma, 'create@test.com');
  const seller = await fixtures.createSeller(prisma, user.id, 'create-seller');
  await fixtures.createWorkflowStatuses(prisma, user.id);

  const service = new SlabhubInventoryService(prisma, env);

  await assert.rejects(
    () =>
      service.createInventoryItem(
        {
          userId: user.id,
          sellerId: seller.id,
          sellerHandle: seller.handle,
          email: user.email,
        },
        {
          itemType: ItemType.SINGLE_CARD_GRADED,
          productName: 'Missing grade metadata',
          quantity: 1,
          sortOrder: 0,
          stage: InventoryStage.ACQUIRED,
          photos: [],
        },
      ),
    /gradeProvider and gradeValue are required/,
  );

  const created = await service.createInventoryItem(
    {
      userId: user.id,
      sellerId: seller.id,
      sellerHandle: seller.handle,
      email: user.email,
    },
    {
      itemType: ItemType.SEALED_PRODUCT,
      productName: 'Romance Dawn Booster Box',
      productType: ProductType.BOOSTER_BOX,
      acquisitionPrice: 110,
      quantity: 1,
      sortOrder: 0,
      stage: InventoryStage.ACQUIRED,
      photos: [],
    },
  );

  assert.equal(created.stage, InventoryStage.ACQUIRED);
  assert.equal(created.status?.systemId, 'ACQUIRED');
  assert.equal((created as any).productName, 'Romance Dawn Booster Box');
});
