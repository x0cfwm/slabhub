import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InventoryService } from '../../inventory/inventory.service';
import { MarketPricingService } from '../market.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryStage } from '@prisma/client';

interface SyncOptions {
    refresh?: boolean;
}

@Command({
    name: 'inventory:sync:prices',
    description: 'Sync marketPriceSnapshot for all inventory items based on current RefPriceChartingProduct data'
})
export class SyncInventoryPricesCommand extends CommandRunner {
    private readonly logger = new Logger(SyncInventoryPricesCommand.name);

    constructor(
        private readonly inventoryService: InventoryService,
        private readonly marketService: MarketPricingService,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async run(passedParam: string[], options?: SyncOptions): Promise<void> {
        try {
            if (options?.refresh) {
                this.logger.log('Starting bulk price sync with REFRESH (crawling/parsing)...');

                // Get all unique products linked to inventory items
                const entries = await this.prisma.inventoryItem.findMany({
                    where: {
                        refPriceChartingProductId: { not: null },
                        stage: { notIn: [InventoryStage.ARCHIVED] }
                    },
                    select: {
                        refPriceChartingProductId: true
                    },
                    distinct: ['refPriceChartingProductId']
                });

                const productIds = entries
                    .map(i => i.refPriceChartingProductId)
                    .filter((id): id is string => !!id);

                this.logger.log(`Refreshing prices for ${productIds.length} unique products...`);

                for (const productId of productIds) {
                    try {
                        this.logger.log(`Refreshing product ${productId}...`);
                        await this.marketService.getProductPriceHistory(productId, false, true);
                        const updates = await this.inventoryService.recalculateMarketPriceSnapshots(productId);
                        for (const up of updates) {
                            const dateStr = up.lastSaleDate ? ` (Last Sale: ${up.lastSaleDate.split('T')[0]})` : '';
                            this.logger.log(`Item ${up.id}: $${up.oldPrice ?? 0} -> $${up.newPrice ?? 0}${dateStr}`);
                        }
                    } catch (error) {
                        this.logger.error(`Failed to refresh product ${productId}: ${error.message}`);
                    }
                }
            } else {
                this.logger.log('Starting bulk price sync (using existing database values)...');
                const updates = await this.inventoryService.syncAllMarketPriceSnapshots();
                for (const up of updates) {
                    const dateStr = up.lastSaleDate ? ` (Last Sale: ${up.lastSaleDate.split('T')[0]})` : '';
                    this.logger.log(`Item ${up.id}: $${up.oldPrice ?? 0} -> $${up.newPrice ?? 0}${dateStr}`);
                }
            }

            this.logger.log('Bulk price sync finished successfully.');
        } catch (error) {
            this.logger.error(`Sync failed: ${error.message}`);
            process.exit(1);
        }
    }

    @Option({
        flags: '-r, --refresh',
        description: 'Force refresh prices from PriceCharting (perform crawling/parsing)',
    })
    parseRefresh(val: string | boolean): boolean {
        return !!val;
    }
}
