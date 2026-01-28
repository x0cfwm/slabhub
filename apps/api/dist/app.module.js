"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const profile_module_1 = require("./modules/profile/profile.module");
const cards_module_1 = require("./modules/cards/cards.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const pricing_module_1 = require("./modules/pricing/pricing.module");
const vendor_module_1 = require("./modules/vendor/vendor.module");
const health_module_1 = require("./modules/health/health.module");
const justtcg_module_1 = require("./modules/justtcg/justtcg.module");
const grading_module_1 = require("./modules/grading/grading.module");
const market_module_1 = require("./modules/market/market.module");
const pricecharting_crawler_module_1 = require("./modules/pricecharting-crawler/pricecharting-crawler.module");
const zod_1 = require("zod");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: (config) => {
                    const schema = zod_1.z.object({
                        DATABASE_URL: zod_1.z.string().url(),
                        JUSTTCG_BASE_URL: zod_1.z.string().url().default('https://api.justtcg.com'),
                        JUSTTCG_API_KEY: zod_1.z.string().min(1),
                        PSA_API_TOKEN: zod_1.z.string().optional(),
                        BRIGHTDATA_CUSTOMER_ID: zod_1.z.string().optional(),
                        BRIGHTDATA_ZONE: zod_1.z.string().optional(),
                        BRIGHTDATA_TOKEN: zod_1.z.string().optional(),
                        PORT: zod_1.z.string().default('3001'),
                    });
                    return schema.parse(config);
                },
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            profile_module_1.ProfileModule,
            cards_module_1.CardsModule,
            inventory_module_1.InventoryModule,
            pricing_module_1.PricingModule,
            vendor_module_1.VendorModule,
            health_module_1.HealthModule,
            justtcg_module_1.JustTcgModule,
            grading_module_1.GradingModule,
            market_module_1.MarketModule,
            pricecharting_crawler_module_1.PriceChartingCrawlerModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map