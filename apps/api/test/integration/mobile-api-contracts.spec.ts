import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InventoryStage, ProductType, ShopEventType } from '@prisma/client';
import { createTestApp } from '../helpers/app';
import { createSeller, createSession, createUser } from '../helpers/fixtures';
import { disconnectPrisma, getPrisma, truncateAllTables } from '../helpers/prisma-test';

function expectIsoDate(value: unknown) {
  expect(typeof value).toBe('string');
  expect(Number.isNaN(Date.parse(value as string))).toBe(false);
}

function expectSellerProfileShape(profile: any) {
  expect(typeof profile).toBe('object');
  expect(typeof profile.handle).toBe('string');
  expect(typeof profile.shopName).toBe('string');
  expect(typeof profile.isActive).toBe('boolean');
  expect(typeof profile.location).toBe('string');
  expect(Array.isArray(profile.paymentsAccepted)).toBe(true);
  expect(Array.isArray(profile.fulfillmentOptions)).toBe(true);
  expect(typeof profile.wishlistText).toBe('string');
  expect(Array.isArray(profile.referenceLinks)).toBe(true);
  expect(Array.isArray(profile.upcomingEvents)).toBe(true);
  expect([null, 'string']).toContain(profile.avatarUrl === null ? null : typeof profile.avatarUrl);
}

function expectMarketProductShape(product: any) {
  expect(typeof product.id).toBe('string');
  expect(typeof product.name).toBe('string');
  expect([null, 'string']).toContain(product.number === null ? null : typeof product.number);
  expect([null, 'string']).toContain(product.imageUrl === null ? null : typeof product.imageUrl);
  expect(typeof product.set).toBe('string');
  expect(['string', null]).toContain(product.setCode === null ? null : typeof product.setCode);
  expect(['string', null]).toContain(product.productType === null ? null : typeof product.productType);
  expect(['string', null]).toContain(product.priceChartingUrl === null ? null : typeof product.priceChartingUrl);
  expect(typeof product.rawPrice).toBe('number');
  expect(['number', null]).toContain(product.sealedPrice === null ? null : typeof product.sealedPrice);
  expectIsoDate(product.lastUpdated);
  expect(typeof product.source).toBe('string');
}

function expectInventoryItemShape(item: any) {
  expect(typeof item.id).toBe('string');
  expect(typeof item.type).toBe('string');
  expect(typeof item.stage).toBe('string');
  expect(typeof item.quantity).toBe('number');
  expect(typeof item.sortOrder).toBe('number');
  expect(Array.isArray(item.photos)).toBe(true);
  expectIsoDate(item.createdAt);
  expectIsoDate(item.updatedAt);

  if (item.type === 'SEALED_PRODUCT') {
    expect(typeof item.productName).toBe('string');
    expect(typeof item.productType).toBe('string');
  }
}

describe('Mobile API contracts', () => {
  const prisma = getPrisma();
  let app: INestApplication;
  let authHeader: Record<string, string>;
  let sellerHandle = 'mobile-seller';
  let marketProductId = '';
  let inventoryItemId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'local';
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);

    const user = await createUser(prisma, 'mobile-contract@test.com');
    const seller = await createSeller(prisma, user.id, sellerHandle);
    const { token } = await createSession(prisma, user.id, 'mobile-token-1');
    authHeader = { Authorization: `Bearer ${token}` };

    const set = await prisma.refPriceChartingSet.create({
      data: { name: 'One Piece OP01', code: 'OP01', slug: 'one-piece-op01' },
    });

    const product = await prisma.refPriceChartingProduct.create({
      data: {
        setId: set.id,
        productUrl: 'https://www.pricecharting.com/game/one-piece-op01/romance-dawn-booster-box',
        title: 'Romance Dawn Booster Box',
        cardNumber: null,
        rawPrice: 120,
        sealedPrice: 150,
        details: {},
      } as any,
    });
    marketProductId = product.id;

    await prisma.priceChartingSales.createMany({
      data: [
        {
          productId: marketProductId,
          date: new Date('2026-01-10T00:00:00.000Z'),
          title: 'Sale 1',
          price: 151,
          source: 'eBay',
          grade: 'Raw',
        },
        {
          productId: marketProductId,
          date: new Date('2026-01-11T00:00:00.000Z'),
          title: 'Sale 2',
          price: 149,
          source: 'eBay',
          grade: 'Raw',
        },
      ] as any,
    });

    const createdItem = await request(app.getHttpServer())
      .post('/v1/inventory')
      .set(authHeader)
      .send({
        itemType: 'SEALED_PRODUCT',
        productName: 'Romance Dawn Booster Box',
        productType: ProductType.BOOSTER_BOX,
        stage: InventoryStage.LISTED,
        refPriceChartingProductId: marketProductId,
        acquisitionPrice: 110,
      })
      .expect(201)
      .then((res) => res.body);
    inventoryItemId = createdItem.id;

    await request(app.getHttpServer())
      .post('/v1/analytics/track')
      .send({ type: ShopEventType.VIEW_SHOP, handle: seller.handle })
      .expect(201);
  });

  it('keeps auth OTP response contract used by mobile auth flow', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/email/request-otp')
      .send({ email: 'mobile-otp@test.com' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual({ ok: true });
      });

    await request(app.getHttpServer())
      .post('/v1/auth/email/verify-otp')
      .send({ email: 'mobile-otp@test.com', otp: '000000' })
      .expect(201)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(typeof res.body.sessionToken).toBe('string');
        expect(typeof res.body.user.id).toBe('string');
        expect(typeof res.body.user.email).toBe('string');
      });
  });

  it('keeps /me contract used by mobile profile/auth boot', async () => {
    await request(app.getHttpServer())
      .get('/v1/me')
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body.id).toBe('string');
        expect(typeof res.body.email).toBe('string');
        expect(['string', null]).toContain(
          res.body.facebookVerifiedAt === null ? null : typeof res.body.facebookVerifiedAt,
        );
        expect(['string', null]).toContain(
          res.body.facebookProfileUrl === null ? null : typeof res.body.facebookProfileUrl,
        );
        if (res.body.profile) {
          expectSellerProfileShape(res.body.profile);
        }
      });
  });

  it('keeps /inventory contracts used by mobile list/update/detail/history', async () => {
    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expectInventoryItemShape(res.body[0]);
      });

    await request(app.getHttpServer())
      .get(`/v1/inventory/${inventoryItemId}`)
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expectInventoryItemShape(res.body);
        expect(res.body.id).toBe(inventoryItemId);
      });

    await request(app.getHttpServer())
      .patch(`/v1/inventory/${inventoryItemId}`)
      .set(authHeader)
      .send({ notes: 'mobile note' })
      .expect(200)
      .expect((res) => {
        expectInventoryItemShape(res.body);
        expect(res.body.notes).toBe('mobile note');
      });

    await request(app.getHttpServer())
      .get(`/v1/inventory/${inventoryItemId}/history`)
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/v1/inventory/stats/market-value-history?days=30')
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(typeof res.body[0].date).toBe('string');
          expect(typeof res.body[0].value).toBe('number');
          expect(typeof res.body[0].cost).toBe('number');
        }
      });
  });

  it('keeps /workflow/statuses contract used by mobile board/status filters', async () => {
    await request(app.getHttpServer())
      .get('/v1/workflow/statuses')
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        const status = res.body[0];
        expect(typeof status.id).toBe('string');
        expect(typeof status.name).toBe('string');
        expect(['string', null]).toContain(status.color === null ? null : typeof status.color);
        expect(typeof status.position).toBe('number');
        expect(typeof status.isEnabled).toBe('boolean');
        expect(['string', null]).toContain(status.systemId === null ? null : typeof status.systemId);
        expect(typeof status.showOnKanban).toBe('boolean');
      });
  });

  it('keeps /vendor/:handle contract used by mobile public profile', async () => {
    await request(app.getHttpServer())
      .get(`/v1/vendor/${sellerHandle}`)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body).toBe('object');
        expectSellerProfileShape(res.body.profile);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(typeof res.body.itemCount).toBe('number');
      });
  });

  it('keeps /market contracts used by mobile pricing screens', async () => {
    await request(app.getHttpServer())
      .get('/v1/market/sync-status')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('lastSyncAt');
        expect(['string', null]).toContain(res.body.lastSyncAt === null ? null : typeof res.body.lastSyncAt);
      });

    await request(app.getHttpServer())
      .get('/v1/market/products?page=1&limit=10')
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body.page).toBe('number');
        expect(typeof res.body.limit).toBe('number');
        expect(typeof res.body.total).toBe('number');
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThan(0);
        expectMarketProductShape(res.body.items[0]);
      });

    await request(app.getHttpServer())
      .get(`/v1/market/products/${marketProductId}`)
      .expect(200)
      .expect((res) => {
        expectMarketProductShape(res.body);
        expect(res.body.id).toBe(marketProductId);
      });

    await request(app.getHttpServer())
      .get('/v1/market/sets')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        const set = res.body[0];
        expect(typeof set.externalId).toBe('string');
        expect(typeof set.name).toBe('string');
        expect(['string', null]).toContain(set.code === null ? null : typeof set.code);
      });

    await request(app.getHttpServer())
      .get(`/v1/market/products/${marketProductId}/prices`)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body.productId).toBe('string');
        expect(typeof res.body.mode).toBe('string');
        expect(Array.isArray(res.body.prices)).toBe(true);
        if (res.body.prices.length > 0) {
          const p = res.body.prices[0];
          expect(typeof p.date).toBe('string');
          expect(typeof p.title).toBe('string');
          expect(typeof p.price).toBe('number');
          expect(typeof p.source).toBe('string');
          if (p.link !== undefined && p.link !== null) {
            expect(typeof p.link).toBe('string');
          }
        }
      });
  });
});
