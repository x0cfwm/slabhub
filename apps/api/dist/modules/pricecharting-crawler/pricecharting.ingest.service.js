"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PriceChartingIngestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingIngestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricecharting_client_1 = require("./pricecharting.client");
const pricecharting_parser_1 = require("./pricecharting.parser");
let PriceChartingIngestService = PriceChartingIngestService_1 = class PriceChartingIngestService {
    constructor(prisma, client, parser) {
        this.prisma = prisma;
        this.client = client;
        this.parser = parser;
        this.logger = new common_1.Logger(PriceChartingIngestService_1.name);
        this.visitedUrls = new Set();
    }
    async crawlOnePieceCards(options = {}) {
        const entrypoint = 'https://www.pricecharting.com/category/one-piece-cards';
        this.logger.log(`Starting crawl from ${entrypoint}`);
        this.visitedUrls.clear();
        let productCount = 0;
        try {
            const categoryHtml = await this.client.fetch(entrypoint);
            const setUrls = this.parser.parseCategoryPage(categoryHtml, 'https://www.pricecharting.com');
            this.logger.log(`Found ${setUrls.length} sets. Crawling sets...`);
            for (const setUrl of setUrls) {
                if (options.onlySetSlug && !setUrl.includes(options.onlySetSlug)) {
                    continue;
                }
                this.logger.log(`Crawling set: ${setUrl}`);
                const productUrls = await this.crawlSetPages(setUrl);
                for (const productUrl of productUrls) {
                    if (this.visitedUrls.has(productUrl))
                        continue;
                    if (options.maxProducts && productCount >= options.maxProducts) {
                        this.logger.log(`Reached maxProducts limit (${options.maxProducts}). Stopping.`);
                        return;
                    }
                    try {
                        await this.crawlAndIngestProduct(productUrl, options);
                        this.visitedUrls.add(productUrl);
                        productCount++;
                        if (productCount % 10 === 0) {
                            this.logger.log(`Progress: ${productCount} products ingested...`);
                        }
                    }
                    catch (error) {
                        this.logger.error(`Error ingesting product ${productUrl}: ${error.message}`);
                    }
                }
            }
            this.logger.log(`Crawl completed. Ingested ${productCount} products.`);
        }
        catch (error) {
            this.logger.error(`Crawl failed: ${error.message}`);
            throw error;
        }
    }
    async crawlSetPages(setUrl) {
        const allProductUrls = [];
        const queuedPages = [setUrl];
        const visitedPages = new Set();
        while (queuedPages.length > 0) {
            const currentUrl = queuedPages.shift();
            if (visitedPages.has(currentUrl))
                continue;
            visitedPages.add(currentUrl);
            try {
                const html = await this.client.fetch(currentUrl);
                const { productUrls, nextPages } = this.parser.parseSetPage(html, 'https://www.pricecharting.com');
                allProductUrls.push(...productUrls);
                for (const nextPage of nextPages) {
                    if (!visitedPages.has(nextPage)) {
                        queuedPages.push(nextPage);
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error crawling set page ${currentUrl}: ${error.message}`);
            }
        }
        return [...new Set(allProductUrls)];
    }
    async crawlAndIngestProduct(url, options) {
        const html = await this.client.fetch(url);
        const parsed = this.parser.parseProductPage(html, url);
        parsed.categorySlug = 'one-piece-cards';
        if (options.dryRun) {
            this.logger.log(`[DRY RUN] Would ingest: ${parsed.productUrl} (TCGPlayerID: ${parsed.tcgPlayerId})`);
            return;
        }
        await this.upsertProduct(parsed);
        if (options.linkRefProducts && parsed.tcgPlayerId) {
            await this.linkToRefProduct(parsed.tcgPlayerId, parsed.productUrl);
        }
    }
    async upsertProduct(data) {
        await this.prisma.refPriceChartingProduct.upsert({
            where: { productUrl: data.productUrl },
            update: {
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                productSlug: data.productSlug,
                scrapedAt: new Date(),
            },
            create: {
                productUrl: data.productUrl,
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                productSlug: data.productSlug,
            },
        });
    }
    async linkToRefProduct(tcgPlayerId, productUrl) {
        const tcgplayerIdStr = tcgPlayerId.toString();
        await this.prisma.refProduct.updateMany({
            where: {
                OR: [
                    { tcgPlayerId: tcgPlayerId },
                    { tcgplayerId: tcgplayerIdStr }
                ]
            },
            data: {
                tcgPlayerId: tcgPlayerId
            }
        });
    }
};
exports.PriceChartingIngestService = PriceChartingIngestService;
exports.PriceChartingIngestService = PriceChartingIngestService = PriceChartingIngestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricecharting_client_1.PriceChartingClient,
        pricecharting_parser_1.PriceChartingParser])
], PriceChartingIngestService);
//# sourceMappingURL=pricecharting.ingest.service.js.map