import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InventoryService } from '../inventory.service';

@Command({
    name: 'inventory:sync:prices',
    description: 'Sync marketPriceSnapshot for all inventory items based on current RefPriceChartingProduct data'
})
export class SyncInventoryPricesCommand extends CommandRunner {
    private readonly logger = new Logger(SyncInventoryPricesCommand.name);

    constructor(private readonly inventoryService: InventoryService) {
        super();
    }

    async run(): Promise<void> {
        try {
            this.logger.log('Starting bulk price sync...');
            await this.inventoryService.syncAllMarketPriceSnapshots();
            this.logger.log('Bulk price sync finished successfully.');
        } catch (error) {
            this.logger.error(`Sync failed: ${error.message}`);
            process.exit(1);
        }
    }
}
