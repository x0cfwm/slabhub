import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CardsModule } from './modules/cards/cards.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { HealthModule } from './modules/health/health.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        ProfileModule,
        CardsModule,
        InventoryModule,
        PricingModule,
        VendorModule,
        HealthModule,
    ],
})
export class AppModule { }
