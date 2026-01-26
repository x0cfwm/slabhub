import { Module } from '@nestjs/common';
import { MarketPricingController } from './market.controller';
import { MarketPricingService } from './market.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MarketPricingController],
    providers: [MarketPricingService],
    exports: [MarketPricingService],
})
export class MarketModule { }
