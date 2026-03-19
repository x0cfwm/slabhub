import { NotFoundException } from '@nestjs/common';
import { CardsService } from '../../src/modules/cards/cards.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('CardsService', () => {
  it('lists cards with transformed URLs', async () => {
    const prisma = createPrismaMock();
    const mediaService = { ensureCdnUrl: jest.fn((v: string) => `cdn:${v}`) };
    const service = new CardsService(prisma, mediaService as any);

    prisma.cardProfile.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Card',
        set: 'Set',
        rarity: 'R',
        cardNumber: '001',
        imageUrl: '/img',
        cardVariants: [{ id: 'v1', variantType: 'NORMAL', language: 'EN', imageUrl: '/vimg' }],
      },
    ]);

    const out = await service.listCards();
    expect(out[0].imageUrl).toBe('cdn:/img');
    expect(out[0].variants[0].imageUrl).toBe('cdn:/vimg');
  });

  it('throws when card does not exist', async () => {
    const prisma = createPrismaMock();
    const service = new CardsService(prisma, { ensureCdnUrl: jest.fn((v) => v) } as any);
    prisma.cardProfile.findUnique.mockResolvedValue(null);

    await expect(service.getCard('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
