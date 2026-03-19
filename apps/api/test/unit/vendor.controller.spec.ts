import { VendorController } from '../../src/modules/vendor/vendor.controller';

describe('VendorController', () => {
  it('delegates to service', async () => {
    const service = { getVendorPage: jest.fn().mockResolvedValue({}) };
    const controller = new VendorController(service as any);
    await expect(controller.getVendorPage('h')).resolves.toEqual({});
  });
});
