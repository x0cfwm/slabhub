import { JustTcgSyncService } from '../../src/modules/justtcg/sync/justtcg.sync.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('JustTcgSyncService', () => {
  it('syncCatalog triggers mapping sync', async () => {
    const client = { fetchPage: jest.fn() };
    const prisma = createPrismaMock();
    prisma.refSyncProgress.findUnique.mockResolvedValue(null);
    prisma.refSyncProgress.upsert.mockResolvedValue({});

    // Mock API page with no items, no more pages.
    client.fetchPage = jest.fn().mockResolvedValue({
      data: [],
      meta: { hasMore: false, lastPage: 1 },
    });

    const service = new JustTcgSyncService(client as any, prisma);
    await service.syncCatalog({ dryRun: true });

    expect(client.fetchPage).toHaveBeenCalled();
  });

  it('throws when target prisma model is missing', async () => {
    const client = {
      fetchPage: jest.fn().mockResolvedValue({ data: [{ id: '1' }], meta: { hasMore: false, lastPage: 1 } }),
    };
    const prisma = { ...createPrismaMock(), refSyncProgress: createPrismaMock().refSyncProgress } as any;
    prisma.refSyncProgress.findUnique.mockResolvedValue(null);
    prisma.refSyncProgress.upsert.mockResolvedValue({});
    prisma.nonExisting = undefined;

    const service = new JustTcgSyncService(client as any, prisma);

    await expect(
      (service as any).upsertItems('NoModel', 'externalId', [{ externalId: '1' }]),
    ).rejects.toThrow('Prisma model NoModel not found');
  });
});
