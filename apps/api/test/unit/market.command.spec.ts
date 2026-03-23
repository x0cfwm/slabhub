import { SyncInventoryPricesCommand } from '../../src/modules/market/cli/market.commands';

describe('SyncInventoryPricesCommand', () => {
  it('runs non-refresh flow', async () => {
    const inventoryService = {
      syncAllMarketPriceSnapshots: jest.fn().mockResolvedValue([{ id: 'i1', oldPrice: 1, newPrice: 2, lastSaleDate: null }]),
      recalculateMarketPriceSnapshots: jest.fn(),
    };
    const marketService = { getProductPriceHistory: jest.fn() };
    const prisma = {
      refSyncProgress: {
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const cmd = new SyncInventoryPricesCommand(inventoryService as any, marketService as any, prisma as any);
    await cmd.run([], { refresh: false });

    expect(inventoryService.syncAllMarketPriceSnapshots).toHaveBeenCalled();
    expect(prisma.refSyncProgress.update).toHaveBeenCalled();
  });

  it('parses refresh option', () => {
    const cmd = new SyncInventoryPricesCommand({} as any, {} as any, {} as any);
    expect(cmd.parseRefresh(true)).toBe(true);
    expect(cmd.parseRefresh('x')).toBe(true);
  });
});
