import { PricingController } from '../../src/modules/pricing/pricing.controller';

describe('PricingController', () => {
  it('delegates list and refresh', async () => {
    const pricingService = {
      listPricing: jest.fn().mockResolvedValue([{ cardProfileId: '1' }]),
      refreshPricing: jest.fn().mockResolvedValue([{ cardProfileId: '1' }]),
    };

    const controller = new PricingController(pricingService as any);

    await expect(controller.listPricing()).resolves.toHaveLength(1);
    await expect(controller.refreshPricing()).resolves.toHaveLength(1);
  });
});
