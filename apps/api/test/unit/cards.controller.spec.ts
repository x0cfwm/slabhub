import { CardsController } from '../../src/modules/cards/cards.controller';

describe('CardsController', () => {
  it('delegates list/get/variants', async () => {
    const service = {
      listCards: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      getCard: jest.fn().mockResolvedValue({ id: 'c1' }),
      listCardVariants: jest.fn().mockResolvedValue([{ id: 'v1' }]),
    };

    const controller = new CardsController(service as any);

    await expect(controller.listCards({ query: 'abc' } as any)).resolves.toEqual([{ id: 'c1' }]);
    await expect(controller.getCard('c1')).resolves.toEqual({ id: 'c1' });
    await expect(controller.getCardVariants('c1')).resolves.toEqual([{ id: 'v1' }]);
  });
});
