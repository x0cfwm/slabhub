import { HealthController } from '../../src/modules/health/health.controller';

describe('HealthController', () => {
  it('returns ok when DB query succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    } as any;

    const controller = new HealthController(prisma);
    const out = await controller.getHealth();

    expect(out.status).toBe('ok');
    expect(out.services.database.status).toBe('healthy');
  });

  it('returns degraded when DB query fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db down')),
    } as any;

    const controller = new HealthController(prisma);
    const out = await controller.getHealth();

    expect(out.status).toBe('degraded');
    expect(out.services.database.status).toBe('unhealthy');
  });
});
