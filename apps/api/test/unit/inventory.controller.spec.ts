import { NotFoundException } from '@nestjs/common';
import { InventoryController } from '../../src/modules/inventory/inventory.controller';

describe('InventoryController', () => {
  let service: any;
  let controller: InventoryController;

  beforeEach(() => {
    service = {
      listItems: jest.fn().mockResolvedValue([]),
      getItem: jest.fn().mockResolvedValue({ id: 'i1' }),
      createItem: jest.fn().mockResolvedValue({ id: 'i1' }),
      reorderItems: jest.fn().mockResolvedValue([]),
      updateItem: jest.fn().mockResolvedValue({ id: 'i1' }),
      deleteItem: jest.fn().mockResolvedValue({ success: true }),
      getItemHistory: jest.fn().mockResolvedValue([]),
      getMarketValueHistory: jest.fn().mockResolvedValue([]),
    };
    controller = new InventoryController(service);
  });

  it('throws without userId', async () => {
    await expect(controller.listItems(undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getItem(undefined, 'i1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.createItem(undefined, 's1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.reorderItems(undefined, [] as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.updateItem(undefined, 'i1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.deleteItem(undefined, 'i1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getItemHistory(undefined, 'i1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getMarketValueHistory(undefined)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates with userId', async () => {
    await expect(controller.listItems('u1')).resolves.toEqual([]);
    await expect(controller.getItem('u1', 'i1')).resolves.toEqual({ id: 'i1' });
  });
});
