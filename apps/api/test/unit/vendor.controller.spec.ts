import { VendorController } from '../../src/modules/vendor/vendor.controller';

describe('VendorController', () => {
  it('delegates to service and passes viewerUserId', async () => {
    const getVendorPage = jest.fn().mockResolvedValue({});
    const service = { getVendorPage } as any;
    const controller = new VendorController(service);
    await expect(controller.getVendorPage('h', 'viewer-1')).resolves.toEqual({});
    expect(getVendorPage).toHaveBeenCalledWith('h', 'viewer-1');
  });
});
