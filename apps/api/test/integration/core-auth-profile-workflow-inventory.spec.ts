import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ItemType, ProductType } from '@prisma/client';
import { createTestApp } from '../helpers/app';
import { createSeller, createUser } from '../helpers/fixtures';
import { disconnectPrisma, getPrisma, truncateAllTables } from '../helpers/prisma-test';

describe('Core integration: auth/profile/workflow/inventory', () => {
  let app: INestApplication;
  const prisma = getPrisma();

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
  });

  it('requests OTP and verifies with 000000 magic code', async () => {
    await createUser(prisma, 'otp@test.com');

    await request(app.getHttpServer())
      .post('/v1/auth/email/request-otp')
      .send({ email: 'otp@test.com' })
      .expect(201)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/v1/auth/email/verify-otp')
      .send({ email: 'otp@test.com', otp: '000000' })
      .expect(201)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.user.email).toBe('otp@test.com');
      });
  });

  it('supports profile CRUD and workflow+inventory routes with auth headers', async () => {
    const user = await createUser(prisma, 'seller@test.com');
    const seller = await createSeller(prisma, user.id, 'seller-handle');

    await request(app.getHttpServer())
      .get('/v1/me')
      .set('x-user-id', seller.id)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('seller@test.com');
      });

    await request(app.getHttpServer())
      .patch('/v1/me')
      .set('x-user-id', seller.id)
      .send({ shopName: 'Updated Shop', handle: 'seller-handle' })
      .expect(200)
      .expect((res) => {
        expect(res.body.profile.shopName).toBe('Updated Shop');
      });

    await request(app.getHttpServer())
      .get('/v1/workflow/statuses')
      .set('x-user-id', seller.id)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });

    const createdItem = await request(app.getHttpServer())
      .post('/v1/inventory')
      .set('x-user-id', seller.id)
      .send({
        itemType: ItemType.SEALED_PRODUCT,
        productName: 'Romance Dawn Booster Box',
        productType: ProductType.BOOSTER_BOX,
      })
      .expect(201)
      .then((res) => res.body);

    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('x-user-id', seller.id)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBe(1);
      });

    await request(app.getHttpServer())
      .get(`/v1/inventory/${createdItem.id}`)
      .set('x-user-id', seller.id)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(createdItem.id);
      });

    await request(app.getHttpServer())
      .get(`/v1/inventory/${createdItem.id}/history`)
      .set('x-user-id', seller.id)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/v1/inventory/${createdItem.id}`)
      .set('x-user-id', seller.id)
      .send({ notes: 'updated' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/inventory/${createdItem.id}`)
      .set('x-user-id', seller.id)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('returns 404 for inventory list without authenticated user', async () => {
    await request(app.getHttpServer()).get('/v1/inventory').expect(404);
  });
});
