import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
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
import { MarketModule } from './modules/market/market.module';
import { PriceChartingCrawlerModule } from './modules/pricecharting-crawler/pricecharting-crawler.module';
import { MediaModule } from './modules/media/media.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { z } from 'zod';

@Module({
    imports: [
        SentryModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),
        ConfigModule.forRoot({
            isGlobal: true,
            validate: (config) => {
                const schema = z.object({
                    DATABASE_URL: z.string().url(),
                    JUSTTCG_BASE_URL: z.string().url().default('https://api.justtcg.com'),
                    JUSTTCG_API_KEY: z.string().min(1),
                    PSA_API_TOKEN: z.string().optional(),
                    BRIGHTDATA_CUSTOMER_ID: z.string().optional(),
                    BRIGHTDATA_ZONE: z.string().optional(),
                    BRIGHTDATA_TOKEN: z.string().optional(),
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
        MarketModule,
        PriceChartingCrawlerModule,
        MediaModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter,
        },
    ],
})
export class AppModule { }
