import { MarketPricingController } from '../../src/modules/market/market.controller';

describe('MarketPricingController', () => {
  it('delegates all handlers', async () => {
    const service = {
      getSyncStatus: jest.fn().mockResolvedValue({ status: 'IDLE' }),
      listProducts: jest.fn().mockResolvedValue({ items: [] }),
      listSets: jest.fn().mockResolvedValue([]),
      getProductPriceHistory: jest.fn().mockResolvedValue({ prices: [] }),
      getProduct: jest.fn().mockResolvedValue({ id: 'p1' }),
    };

    const controller = new MarketPricingController(service as any);

    await expect(controller.getSyncStatus()).resolves.toEqual({ status: 'IDLE' });
    await expect(controller.getProducts({} as any, 'u1')).resolves.toEqual({ items: [] });
    await expect(controller.getSets()).resolves.toEqual([]);
    await expect(controller.getProductPrices('p1', 'true', 'false')).resolves.toEqual({ prices: [] });
    await expect(controller.getProduct('p1')).resolves.toEqual({ id: 'p1' });

    expect(service.getProductPriceHistory).toHaveBeenCalledWith('p1', true, false);
  });
});
