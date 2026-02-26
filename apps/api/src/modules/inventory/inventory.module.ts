import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MediaModule } from '../media/media.module';
import { SyncInventoryPricesCommand } from './cli/inventory.commands';

@Module({
    imports: [MediaModule],
    controllers: [InventoryController],
    providers: [InventoryService, SyncInventoryPricesCommand],
    exports: [InventoryService],
})
export class InventoryModule { }
