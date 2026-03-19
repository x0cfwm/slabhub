import { PricingService } from '../../src/modules/pricing/pricing.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('PricingService', () => {
  it('lists pricing snapshots', async () => {
    const prisma = createPrismaMock();
    const service = new PricingService(prisma);

    prisma.pricingSnapshot.findMany.mockResolvedValue([
      {
        cardProfileId: 'c1',
        rawPrice: 12.5,
        sealedPrice: 20,
        source: 'Mock',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        cardProfile: {
          id: 'c1',
          name: 'Name',
          set: 'Set',
          rarity: 'R',
          cardNumber: '001',
          imageUrl: '/x',
        },
      },
    ]);

    const out = await service.listPricing();
    expect(out[0].rawPrice).toBe(12.5);
    expect(out[0].cardProfile.id).toBe('c1');
  });

  it('returns null when pricing snapshot missing', async () => {
    const prisma = createPrismaMock();
    const service = new PricingService(prisma);
    prisma.pricingSnapshot.findUnique.mockResolvedValue(null);
    await expect(service.getPricingForCard('c1')).resolves.toBeNull();
  });
});
