import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { MarketPricingService } from '../../src/modules/market/market.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('MarketPricingService', () => {
  let prisma: any;
  let parser: any;
  let mediaService: any;
  let inventoryService: any;
  let service: MarketPricingService;

  beforeEach(() => {
    prisma = createPrismaMock();
    parser = { parse: jest.fn() };
    mediaService = { ensureCdnUrl: jest.fn((u: string) => `cdn:${u}`) };
    inventoryService = { recalculateMarketPriceSnapshots: jest.fn().mockResolvedValue([]) };
    service = new MarketPricingService(prisma, parser, mediaService, inventoryService);
  });

  it('returns idle sync status if progress is absent', async () => {
    prisma.refSyncProgress.findUnique.mockResolvedValue(null);
    const out = await service.getSyncStatus();
    expect(out.status).toBe('IDLE');
  });

  it('lists products with mapping', async () => {
    prisma.refPriceChartingProduct.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'Card A',
        cardNumber: '001',
        imageUrl: '/img',
        set: { name: 'Set A', code: 'OP01' },
        productType: 'SINGLE_CARD',
        productUrl: 'https://pc/item',
        tcgPlayerId: 123,
        rawPrice: 12,
        sealedPrice: null,
        grade7Price: null,
        grade8Price: null,
        grade9Price: null,
        grade95Price: null,
        grade10Price: null,
        priceUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        priceSource: 'PriceCharting',
      },
    ]);
    prisma.refPriceChartingProduct.count.mockResolvedValue(1);

    const out = await service.listProducts({ page: 1, limit: 25 } as any, 'u1');
    expect(out.total).toBe(1);
    expect(out.items[0].imageUrl).toBe('cdn:/img');
  });

  it('throws when getProduct misses or has no price', async () => {
    prisma.refPriceChartingProduct.findUnique.mockResolvedValue(null);
    await expect(service.getProduct('bad')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns stored history when sales exist and refresh=false', async () => {
    prisma.refPriceChartingProduct.findUnique.mockResolvedValue({
      id: 'p1',
      productUrl: 'https://pc/item',
      rawPrice: 11,
      grade7Price: 1,
      grade8Price: 2,
      grade9Price: 3,
      grade95Price: 4,
      grade10Price: 5,
      tcgPlayerId: null,
    });
    prisma.priceChartingSales.findMany.mockResolvedValue([
      {
        date: new Date('2026-01-01T00:00:00.000Z'),
        title: 'Sale',
        price: 10,
        source: 'eBay',
        link: 'https://example.com',
        grade: 'Raw',
      },
    ]);

    const out = await service.getProductPriceHistory('p1', false, false);
    expect(out.mode).toBe('stored');
    expect(out.prices).toHaveLength(1);
  });

  it('throws strict parse errors as not found for 404', async () => {
    prisma.refPriceChartingProduct.findUnique.mockResolvedValue({ id: 'p1', productUrl: 'https://pc/item' });
    prisma.priceChartingSales.findMany.mockResolvedValue([]);
    parser.parse.mockRejectedValue(new Error('404 page missing'));

    await expect(service.getProductPriceHistory('p1', true, true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws non-strict parse errors as bad gateway', async () => {
    prisma.refPriceChartingProduct.findUnique.mockResolvedValue({ id: 'p1', productUrl: 'https://pc/item' });
    prisma.priceChartingSales.findMany.mockResolvedValue([]);
    parser.parse.mockRejectedValue(new Error('upstream timeout'));

    await expect(service.getProductPriceHistory('p1', false, true)).rejects.toBeInstanceOf(BadGatewayException);
  });
});
