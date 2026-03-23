import { InventoryStage, ItemType, ProductType } from '@prisma/client';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { MarketPricingService } from '../../src/modules/market/market.service';
import { WorkflowStatusService } from '../../src/modules/workflow/workflow-status.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { disconnectPrisma, getPrisma, truncateAllTables } from '../helpers/prisma-test';
import { createSeller, createUser } from '../helpers/fixtures';

describe('DB integrity integration: workflow/inventory/market snapshot flows', () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  it('seeds workflow statuses, records inventory transitions, and recalculates snapshots', async () => {
    const user = await createUser(prisma, 'flow@test.com');
    const seller = await createSeller(prisma, user.id, 'flow-handle');

    const workflowService = new WorkflowStatusService(prisma as unknown as PrismaService);
    const statuses = await workflowService.seedStatuses(user.id);
    expect(statuses.length).toBeGreaterThan(0);

    const set = await prisma.refPriceChartingSet.create({ data: { name: 'Set', code: 'OP01', slug: 'op01' } });
    const product = await prisma.refPriceChartingProduct.create({
      data: {
        productUrl: 'https://pc/flow',
        setId: set.id,
        title: 'Flow Product',
        rawPrice: 10,
        details: {},
      } as any,
    });
    await prisma.priceChartingSales.createMany({
      data: [
        { productId: product.id, date: new Date('2026-01-01T00:00:00.000Z'), title: 'A', price: 11, source: 'eBay' },
        { productId: product.id, date: new Date('2026-01-02T00:00:00.000Z'), title: 'B', price: 13, source: 'eBay' },
      ] as any,
    });

    const inventoryService = new InventoryService(prisma as any, {
      getPublicUrl: () => null,
      ensureCdnUrl: (u: string) => u,
    } as any);

    const item = await inventoryService.createItem(user.id, seller.id, {
      itemType: ItemType.SEALED_PRODUCT,
      productName: 'Flow Box',
      productType: ProductType.BOOSTER_BOX,
      refPriceChartingProductId: product.id,
    } as any);

    await inventoryService.updateItem(user.id, item.id, { stage: InventoryStage.LISTED } as any);

    const history = await inventoryService.getItemHistory(user.id, item.id);
    expect(Array.isArray(history)).toBe(true);

    const marketService = new MarketPricingService(
      prisma as any,
      { parse: jest.fn() } as any,
      { ensureCdnUrl: (u: string) => u } as any,
      inventoryService,
    );

    const priceResult = await marketService.getProductPriceHistory(product.id, false, false);
    expect(priceResult.prices.length).toBeGreaterThan(0);
  });
});
