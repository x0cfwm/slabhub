import { Module } from '@nestjs/common';
import { MarketPricingController } from './market.controller';
import { MarketPricingService } from './market.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceChartingParser } from './parsers/pricecharting.parser';

import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [PrismaModule, MediaModule, InventoryModule],
    controllers: [MarketPricingController],
    providers: [MarketPricingService, PriceChartingParser],
    exports: [MarketPricingService],
})
export class MarketModule { }
