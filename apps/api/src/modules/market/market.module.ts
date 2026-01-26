import { Module } from '@nestjs/common';
import { MarketPricingController } from './market.controller';
import { MarketPricingService } from './market.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceChartingParser } from './parsers/pricecharting.parser';

@Module({
    imports: [PrismaModule],
    controllers: [MarketPricingController],
    providers: [MarketPricingService, PriceChartingParser],
    exports: [MarketPricingService],
})
export class MarketModule { }
