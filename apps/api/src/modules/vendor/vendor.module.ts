import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [MediaModule, InventoryModule],
    controllers: [VendorController],
    providers: [VendorService],
    exports: [VendorService],
})
export class VendorModule { }
