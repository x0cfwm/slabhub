import { NotFoundException } from '@nestjs/common';
import { VendorService } from '../../src/modules/vendor/vendor.service';
import { createPrismaMock } from '../mocks/prisma.mock';

function buildModerationMock(blockedUserIds: string[] = []) {
  return { getBlockedUserIds: jest.fn().mockResolvedValue(blockedUserIds) } as any;
}

describe('VendorService', () => {
  it('throws for missing vendor', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue(null);

    const service = new VendorService(
      prisma,
      { getPublicUrl: jest.fn() } as any,
      { transformItem: jest.fn() } as any,
      buildModerationMock(),
    );

    await expect(service.getVendorPage('unknown')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns vendor page with mapped items', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      handle: 'seller',
      shopName: 'Shop',
      isActive: true,
      location: '',
      paymentsAccepted: [],
      meetupsEnabled: false,
      shippingEnabled: true,
      fulfillmentOptions: ['shipping'],
      socials: {},
      wishlistText: '',
      referenceLinks: [],
      upcomingEvents: [],
      user: { email: 'a@b.com', facebookVerifiedAt: null, oauthIdentities: [] },
      avatarMedia: null,
    });
    prisma.inventoryItem.findMany.mockResolvedValue([{ id: 'i1' }]);

    const service = new VendorService(
      prisma,
      { getPublicUrl: jest.fn().mockReturnValue('avatar-url') } as any,
      { transformItem: jest.fn().mockReturnValue({ id: 'i1' }) } as any,
      buildModerationMock(),
    );

    const out = await service.getVendorPage('seller');
    expect(out.itemCount).toBe(1);
    expect(out.items[0].id).toBe('i1');
  });

  it('hides blocked vendors with a 404 to authenticated viewers', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findUnique.mockResolvedValue({
      id: 's1',
      userId: 'u-blocked',
      handle: 'bad-shop',
    });

    const service = new VendorService(
      prisma,
      { getPublicUrl: jest.fn() } as any,
      { transformItem: jest.fn() } as any,
      buildModerationMock(['u-blocked']),
    );

    await expect(service.getVendorPage('bad-shop', 'viewer-id'))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
