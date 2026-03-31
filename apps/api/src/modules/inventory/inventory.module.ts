import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MediaModule } from '../media/media.module';
import { InventoryPresenter } from './inventory.presenter';
import { InventoryValuationService } from './inventory-valuation.service';

@Module({
    imports: [MediaModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryPresenter, InventoryValuationService],
    exports: [InventoryService, InventoryPresenter, InventoryValuationService],
})
export class InventoryModule { }
