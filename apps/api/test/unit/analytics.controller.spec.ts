import { UnauthorizedException } from '@nestjs/common';
import { AnalyticsController } from '../../src/modules/analytics/analytics.controller';
import { makeReq } from '../helpers/http';

describe('AnalyticsController', () => {
  it('extracts request metadata for trackEvent', async () => {
    const service = { trackEvent: jest.fn().mockResolvedValue({ ok: true }) };
    const controller = new AnalyticsController(service as any);

    const req = makeReq({
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
        'user-agent': 'ua',
      },
    });

    await expect(controller.trackEvent({ type: 'VIEW_SHOP', handle: 'seller' } as any, req as any)).resolves.toEqual({
      ok: true,
    });

    expect(service.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '1.1.1.1', userAgent: 'ua' }),
    );
  });

  it('requires authentication for dashboard endpoint', async () => {
    const service = { getDashboardStats: jest.fn() };
    const controller = new AnalyticsController(service as any);

    await expect(controller.getDashboardStats(undefined, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
