import { NotFoundException } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import { ShopEventType } from '@prisma/client';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { createPrismaMock } from '../mocks/prisma.mock';

jest.mock('geoip-lite', () => ({
  lookup: jest.fn(),
}));

describe('AnalyticsService', () => {
  it('throws when vendor handle does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue(null);

    const service = new AnalyticsService(prisma);

    await expect(
      service.trackEvent({
        type: ShopEventType.VIEW_SHOP,
        handle: 'missing',
        ip: '1.1.1.1',
        userAgent: 'ua',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('detects channel from user-agent and stores event', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: 's1' });
    prisma.shopEvent.create.mockResolvedValue({ id: 'e1' });
    (geoip.lookup as jest.Mock).mockReturnValue({ country: 'US' } as any);

    const service = new AnalyticsService(prisma);

    await service.trackEvent({
      type: ShopEventType.VIEW_SHOP,
      handle: 'seller',
      ip: '8.8.8.8',
      userAgent: 'Instagram 123',
    } as any);

    expect(prisma.shopEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'instagram',
          countryCode: 'US',
        }),
      }),
    );
  });

  it('returns empty dashboard for users without seller profile', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue(null);

    const service = new AnalyticsService(prisma);
    const out = await service.getDashboardStats('u1', 7);

    expect(out.summary.totalViews).toBe(0);
    expect(out.views).toEqual([]);
  });
});
