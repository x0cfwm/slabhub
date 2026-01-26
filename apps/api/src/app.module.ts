import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CardsModule } from './modules/cards/cards.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { HealthModule } from './modules/health/health.module';
import { JustTcgModule } from './modules/justtcg/justtcg.module';
import { GradingModule } from './modules/grading/grading.module';
import { z } from 'zod';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: (config) => {
                const schema = z.object({
                    DATABASE_URL: z.string().url(),
                    JUSTTCG_BASE_URL: z.string().url().default('https://api.justtcg.com'),
                    JUSTTCG_API_KEY: z.string().min(1),
                    PORT: z.string().default('3001'),
                });
                return schema.parse(config);
            },
        }),
        PrismaModule,
        AuthModule,
        ProfileModule,
        CardsModule,
        InventoryModule,
        PricingModule,
        VendorModule,
        HealthModule,
        JustTcgModule,
        GradingModule,
    ],
})
export class AppModule { }
