"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingCrawlerModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const prisma_module_1 = require("../prisma/prisma.module");
const pricecharting_client_1 = require("./pricecharting.client");
const pricecharting_parser_1 = require("./pricecharting.parser");
const pricecharting_ingest_service_1 = require("./pricecharting.ingest.service");
const pricecharting_commands_1 = require("./cli/pricecharting.commands");
let PriceChartingCrawlerModule = class PriceChartingCrawlerModule {
};
exports.PriceChartingCrawlerModule = PriceChartingCrawlerModule;
exports.PriceChartingCrawlerModule = PriceChartingCrawlerModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, prisma_module_1.PrismaModule],
        providers: [
            pricecharting_client_1.PriceChartingClient,
            pricecharting_parser_1.PriceChartingParser,
            pricecharting_ingest_service_1.PriceChartingIngestService,
            pricecharting_commands_1.CrawlOnePieceCommand,
        ],
        exports: [pricecharting_ingest_service_1.PriceChartingIngestService],
    })
], PriceChartingCrawlerModule);
//# sourceMappingURL=pricecharting-crawler.module.js.map