import * as crypto from 'crypto';
import { AuthMiddleware } from '../../src/modules/auth/auth.middleware';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('AuthMiddleware', () => {
  beforeEach(() => {
    process.env.SESSION_COOKIE_NAME = 'slabhub_session';
  });

  it('uses valid session and sets user/seller', async () => {
    const prisma = createPrismaMock();
    const middleware = new AuthMiddleware(prisma);

    const token = 'token-1';
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    prisma.session.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.sessionTokenHash === hash) {
        return {
          userId: 'u1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 10_000),
          user: { sellerProfile: { id: 's1', handle: 'seller-1', userId: 'u1' } },
        };
      }
      return null;
    });

    const req = {
      headers: {},
      cookies: { [process.env.SESSION_COOKIE_NAME || 'slabhub_session']: token },
    } as any;

    const next = jest.fn();
    await middleware.use(req, {} as any, next);

    expect(req.userId).toBe('u1');
    expect(req.sellerId).toBe('s1');
    expect(req.sellerHandle).toBe('seller-1');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to x-user-id header', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: 's2', handle: 'h2', userId: 'u2' });

    const middleware = new AuthMiddleware(prisma);
    const req = { headers: { 'x-user-id': 's2' }, cookies: {} } as any;

    const next = jest.fn();
    await middleware.use(req, {} as any, next);

    expect(req.userId).toBe('u2');
    expect(req.sellerId).toBe('s2');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to bearer authorization when cookie missing', async () => {
    const prisma = createPrismaMock();
    prisma.session.findUnique.mockResolvedValue({
      userId: 'u3',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
      user: { sellerProfile: null },
    });

    const middleware = new AuthMiddleware(prisma);
    const req = { headers: { authorization: 'Bearer t3' }, cookies: {} } as any;

    const next = jest.fn();
    await middleware.use(req, {} as any, next);

    expect(req.userId).toBe('u3');
    expect(next).toHaveBeenCalled();
  });
});
