import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileService } from '../../src/modules/profile/profile.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('ProfileService', () => {
  let prisma: any;
  let mediaService: any;
  let service: ProfileService;

  beforeEach(() => {
    prisma = createPrismaMock();
    mediaService = {
      getPublicUrl: jest.fn().mockReturnValue('https://cdn/avatar.jpg'),
    };
    service = new ProfileService(prisma, mediaService);
  });

  it('getProfileByUserId throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfileByUserId('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getProfileByUserId returns transformed data', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      facebookVerifiedAt: null,
      oauthIdentities: [{ provider: 'facebook', profileUrl: 'https://fb/me' }],
      sellerProfile: {
        id: 's1',
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
        avatarId: null,
        avatarMedia: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const out = await service.getProfileByUserId('u1');
    expect(out.id).toBe('u1');
    expect(out.facebookProfileUrl).toBe('https://fb/me');
    expect(out.profile.handle).toBe('seller');
  });

  it('updateProfile throws on taken handle', async () => {
    prisma.sellerProfile.findUnique
      .mockResolvedValueOnce({ id: 'sp1', userId: 'u1' })
      .mockResolvedValueOnce({ id: 'sp2', userId: 'u2' });

    await expect(service.updateProfile('u1', { handle: 'taken' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateProfile requires handle/shopName for new profile', async () => {
    prisma.sellerProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(service.updateProfile('u1', { location: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteAccount anonymizes user', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.findMany.mockResolvedValue([{ email: 'removed-2@slabhub.gg' }]);
    prisma.inventoryItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.sellerProfile.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    await expect(service.deleteAccount('u1')).resolves.toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ email: 'removed-3@slabhub.gg' }),
      }),
    );
  });
});
