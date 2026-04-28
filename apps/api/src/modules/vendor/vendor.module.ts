import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
    imports: [MediaModule, InventoryModule, ModerationModule],
    controllers: [VendorController],
    providers: [VendorService],
    exports: [VendorService],
})
export class VendorModule { }
