import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemType, InventoryStage } from '@prisma/client';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('InventoryService', () => {
  let prisma: any;
  let presenter: any;
  let valuationService: any;
  let service: InventoryService;

  beforeEach(() => {
    prisma = createPrismaMock();
    presenter = {
      transformItem: jest.fn((item: any) => ({ ...item, type: item.itemType })),
    };
    valuationService = {
      clearCache: jest.fn(),
      getMarketPrice: jest.fn(),
      getMarketValueHistory: jest.fn(),
      syncAllMarketPriceSnapshots: jest.fn(),
      recalculateMarketPriceSnapshots: jest.fn(),
    };
    service = new InventoryService(prisma, presenter, valuationService);
  });

  it('lists and transforms items', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'i1',
        itemType: 'SINGLE_CARD_RAW',
        cardVariantId: null,
        refPriceChartingProductId: null,
        condition: 'NM',
        photos: [],
        quantity: 1,
        sortOrder: 0,
        stage: 'ACQUIRED',
        statusId: null,
        status: null,
        frontMediaId: null,
        backMediaId: null,
        frontMedia: null,
        backMedia: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const out = await service.listItems('u1');
    expect(out).toHaveLength(1);
    expect(valuationService.clearCache).toHaveBeenCalled();
    expect(presenter.transformItem).toHaveBeenCalled();
    expect(out[0].type).toBe('SINGLE_CARD_RAW');
  });

  it('throws when getItem is missing', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.getItem('u1', 'i1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates required fields for SINGLE_CARD_GRADED', async () => {
    await expect(
      service.createItem('u1', 's1', {
        itemType: ItemType.SINGLE_CARD_GRADED,
        productName: 'Card',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('wraps DB create errors as bad request', async () => {
    prisma.inventoryItem.create.mockRejectedValue(new Error('db error'));

    await expect(
      service.createItem('u1', 's1', {
        itemType: ItemType.SEALED_PRODUCT,
        productName: 'Box',
        productType: 'BOOSTER_BOX',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateItem throws when item does not exist', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.updateItem('u1', 'i1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deleteItem throws when item does not exist', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue(null);
    await expect(service.deleteItem('u1', 'i1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getMarketPrice handles sealed and raw card scenarios', () => {
    valuationService.getMarketPrice.mockReturnValueOnce(15).mockReturnValueOnce(4);

    expect(service.getMarketPrice({ itemType: 'SEALED_PRODUCT' })).toBe(15);
    expect(service.getMarketPrice({ itemType: 'SINGLE_CARD_RAW' })).toBe(4);
  });

  it('transformItem returns graded payload', () => {
    presenter.transformItem.mockReturnValueOnce({
      type: 'SINGLE_CARD_GRADED',
      gradeProvider: 'PSA',
    });

    const out = service.transformItem({
      id: 'i1',
      itemType: 'SINGLE_CARD_GRADED',
      cardVariantId: null,
      refPriceChartingProductId: null,
      gradeProvider: 'PSA',
      gradeValue: '10',
      certNumber: '123',
      gradingCost: 20,
      slabImages: {},
      gradingMeta: {},
      previousCertNumbers: [],
      photos: [],
      quantity: 1,
      sortOrder: 0,
      stage: InventoryStage.ACQUIRED,
      statusId: null,
      status: null,
      frontMediaId: null,
      backMediaId: null,
      frontMedia: null,
      backMedia: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(out.type).toBe('SINGLE_CARD_GRADED');
    expect(out.gradeProvider).toBe('PSA');
  });
});
