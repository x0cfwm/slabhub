import { PriceChartingIngestService } from '../../src/modules/pricecharting-crawler/pricecharting.ingest.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('PriceChartingIngestService', () => {
  it('runs dry-run crawl without DB writes', async () => {
    const prisma = createPrismaMock();
    const client = {
      fetch: jest.fn(async (url: string) => {
        if (url.includes('/category/')) return '<category />';
        if (url.includes('/console/')) return '<set />';
        return '<product />';
      }),
      fetchBinary: jest.fn(),
    };

    const parser = {
      parseCategoryPage: jest.fn().mockReturnValue(['https://www.pricecharting.com/console/one-piece-op01']),
      parseSetPage: jest
        .fn()
        .mockReturnValue({ productUrls: ['https://www.pricecharting.com/game/op01/item-1'], nextPages: [], setCode: 'OP01', setName: 'Set 1' }),
      parseProductPage: jest.fn().mockReturnValue({
        productUrl: 'https://www.pricecharting.com/game/op01/item-1',
        tcgPlayerId: 123,
        details: {},
        sales: [],
      }),
    };

    const service = new PriceChartingIngestService(
      prisma,
      client as any,
      parser as any,
      { putFromRemoteUrl: jest.fn(), getPublicUrl: jest.fn() } as any,
      { recalculateMarketPriceSnapshots: jest.fn().mockResolvedValue([]) } as any,
    );

    await expect(service.crawlOnePieceCards({ dryRun: true, maxProducts: 1 })).resolves.toBeUndefined();
    expect(client.fetch).toHaveBeenCalled();
  });
});
