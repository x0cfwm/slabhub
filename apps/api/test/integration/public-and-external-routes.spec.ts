import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InventoryStage, ShopEventType } from '@prisma/client';
import { GradingRecognitionService } from '../../src/modules/grading/grading-recognition.service';
import { MediaService } from '../../src/modules/media/media.service';
import { OauthFacebookService } from '../../src/modules/oauth-facebook/oauth-facebook.service';
import { createTestApp } from '../helpers/app';
import { createInvite, createSeller, createSession, createUser } from '../helpers/fixtures';
import { disconnectPrisma, getPrisma, truncateAllTables } from '../helpers/prisma-test';

describe('Public/external integration routes', () => {
  let app: INestApplication;
  const prisma = getPrisma();

  beforeAll(async () => {
    jest.spyOn(MediaService.prototype, 'putBuffer').mockResolvedValue({
      id: 'm1',
      hash: 'hash',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      bucket: 'bucket',
      key: 'key',
      ext: 'jpg',
      etag: null,
      ownerUserId: null,
      sourceUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    jest.spyOn(MediaService.prototype, 'getPublicUrl').mockReturnValue('https://cdn.test/key');
    jest.spyOn(GradingRecognitionService.prototype, 'recognizeFromImage').mockResolvedValue({ success: true } as any);
    jest.spyOn(OauthFacebookService.prototype, 'handleCallback').mockImplementation(async (_code, res: any) => {
      return res.redirect('http://localhost:3000/dashboard');
    });

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectPrisma();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  it('serves health endpoint', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('covers cards, pricing, waitlist endpoints', async () => {
    const user = await createUser(prisma, 'cards@test.com');
    await prisma.cardProfile.create({
      data: {
        id: 'card-1',
        name: 'Card 1',
        set: 'OP01',
        rarity: 'R',
        cardNumber: '001',
        imageUrl: '/img.jpg',
      },
    });
    await prisma.cardVariant.create({
      data: {
        cardId: 'card-1',
        variantType: 'NORMAL',
        language: 'EN',
        imageUrl: '/img.jpg',
        name: 'Card 1',
        setName: 'OP01',
        setNumber: '001',
      },
    });

    await request(app.getHttpServer()).get('/v1/cards').expect(200);
    await request(app.getHttpServer()).get('/v1/cards/card-1').expect(200);
    await request(app.getHttpServer()).get('/v1/cards/card-1/variants').expect(200);

    await request(app.getHttpServer()).get('/v1/pricing').expect(200);
    await request(app.getHttpServer()).post('/v1/pricing/refresh').expect(201);

    await request(app.getHttpServer())
      .post('/v1/waitlist')
      .send({ email: 'wait@test.com', name: 'Wait User' })
      .expect(200);
  });

  it('covers vendor, analytics, market routes', async () => {
    const user = await createUser(prisma, 'vendor@test.com');
    const seller = await createSeller(prisma, user.id, 'vendor-handle');

    await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        sellerId: seller.id,
        itemType: 'SEALED_PRODUCT',
        productName: 'Box',
        productType: 'BOOSTER_BOX',
        stage: InventoryStage.LISTED,
      },
    });

    const set = await prisma.refPriceChartingSet.create({ data: { name: 'Set A', code: 'OP01', slug: 'op01' } });
    const product = await prisma.refPriceChartingProduct.create({
      data: {
        productUrl: 'https://pc/item-1',
        title: 'Item 1',
        setId: set.id,
        rawPrice: 10,
        details: {},
      } as any,
    });
    await prisma.priceChartingSales.create({
      data: {
        productId: product.id,
        date: new Date('2026-01-01T00:00:00.000Z'),
        title: 'Sale',
        price: 12,
        source: 'eBay',
      } as any,
    });

    await request(app.getHttpServer()).get('/v1/vendor/vendor-handle').expect(200);

    await request(app.getHttpServer())
      .post('/v1/analytics/track')
      .send({ type: ShopEventType.VIEW_SHOP, handle: 'vendor-handle' })
      .expect(201);

    await request(app.getHttpServer()).get('/v1/analytics/dashboard').expect(401);

    await request(app.getHttpServer()).get('/v1/market/sync-status').expect(200);
    await request(app.getHttpServer()).get('/v1/market/products').expect(200);
    await request(app.getHttpServer()).get('/v1/market/sets').expect(200);
    await request(app.getHttpServer()).get(`/v1/market/products/${product.id}`).expect(200);
    await request(app.getHttpServer()).get(`/v1/market/products/${product.id}/prices`).expect(200);
  });

  it('covers invite, oauth, grading and media routes', async () => {
    const user = await createUser(prisma, 'invite@test.com');
    await createSeller(prisma, user.id, 'invite-handle');
    const { token } = await createSession(prisma, user.id, 'session-token-1');
    await createInvite(prisma, user.id, 'invite-hash');

    await request(app.getHttpServer())
      .get('/v1/invites/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/invites/accepted')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer()).get('/v1/invites/preview/invite-hash').expect(200);

    await request(app.getHttpServer()).get('/v1/auth/facebook').expect(302);
    await request(app.getHttpServer()).get('/v1/auth/facebook/callback?code=test').expect(302);
    await request(app.getHttpServer()).delete('/v1/auth/facebook').expect(401);

    await request(app.getHttpServer())
      .post('/v1/grading/lookup')
      .send({ grader: 'BGS', certNumber: '1' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/grading/recognize')
      .attach('file', Buffer.from('abc'), 'sample.jpg')
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/media/upload')
      .attach('file', Buffer.from('abc'), 'sample.jpg')
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/media/upload')
      .expect(400);
  });
});
