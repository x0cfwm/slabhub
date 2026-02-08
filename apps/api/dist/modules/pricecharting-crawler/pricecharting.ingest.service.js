"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
        if (parsed.imageUrl) {
            try {
                parsed.localImagePath = await this.downloadImage(parsed.imageUrl, parsed.productSlug || 'unknown');
            }
            catch (error) {
                this.logger.error(`Failed to download image for ${url}: ${error.message}`);
            }
        }
        if (options.dryRun) {
            this.logger.log(`[DRY RUN] Would ingest: ${parsed.productUrl} (TCGPlayerID: ${parsed.tcgPlayerId})`);
            return;
        }
        await this.upsertProduct(parsed);
        if (options.linkRefProducts && parsed.tcgPlayerId) {
            await this.linkToRefProduct(parsed.tcgPlayerId, parsed.productUrl);
        }
    }
    async downloadImage(url, slug) {
        const buffer = await this.client.fetchBinary(url);
        const uploadDir = path.join(process.cwd(), 'uploads', 'pricecharting');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `${slug}.${extension}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        return `/uploads/pricecharting/${fileName}`;
    }
    async upsertProduct(data) {
        let setId;
        if (data.setName) {
            const set = await this.prisma.refPriceChartingSet.upsert({
                where: { name: data.setName },
                update: {
                    slug: data.setSlug,
                },
                create: {
                    name: data.setName,
                    slug: data.setSlug,
                },
            });
            setId = set.id;
        }
        await this.prisma.refPriceChartingProduct.upsert({
            where: { productUrl: data.productUrl },
            update: {
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                setId: setId,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
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
                setId: setId,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
            },
        });
    }
    async linkToRefProduct(tcgPlayerId, productUrl) {
        const tcgplayerIdStr = tcgPlayerId.toString();
        await this.prisma.refProduct.updateMany({
            where: {
                tcgplayerId: tcgplayerIdStr
            },
            data: {
                tcgplayerId: tcgplayerIdStr
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