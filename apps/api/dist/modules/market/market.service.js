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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricecharting_parser_1 = require("./parsers/pricecharting.parser");
let MarketPricingService = class MarketPricingService {
    constructor(prisma, parser) {
        this.prisma = prisma;
        this.parser = parser;
        this.cache = new Map();
        this.rateLimit = new Map();
    }
    async listProducts(query) {
        const { page = 1, limit = 25, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { number: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.refProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.refProduct.count({ where }),
        ]);
        const tcgPlayerIds = items.map(i => i.tcgPlayerId).filter((id) => id !== null);
        const pcProducts = await this.prisma.refPriceChartingProduct.findMany({
            where: { tcgPlayerId: { in: tcgPlayerIds } }
        });
        const pcMap = new Map(pcProducts
            .filter((p) => p.tcgPlayerId !== null)
            .map(p => [p.tcgPlayerId, p.productUrl]));
        const mappedItems = items.map(product => {
            const hash = this.simpleHash(product.id);
            const basePrice = (hash % 100) + 10;
            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
                priceChartingUrl: product.tcgPlayerId ? pcMap.get(product.tcgPlayerId) : null,
                tcgplayerId: product.tcgplayerId,
                rawPrice: parseFloat(basePrice.toFixed(2)),
                sealedPrice: hash % 3 === 0 ? parseFloat((basePrice * 4.5).toFixed(2)) : null,
                lastUpdated: new Date().toISOString(),
                source: hash % 2 === 0 ? 'Mock:eBay' : 'Mock:TCGPlayer',
            };
        });
        return {
            items: mappedItems,
            page,
            limit,
            total,
        };
    }
    async getProductPriceHistory(productId, strict = false, refresh = false) {
        const product = await this.prisma.refProduct.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        let priceChartingUrl = null;
        if (product.tcgPlayerId) {
            const pcProduct = await this.prisma.refPriceChartingProduct.findFirst({
                where: { tcgPlayerId: product.tcgPlayerId }
            });
            priceChartingUrl = pcProduct?.productUrl || null;
        }
        if (!priceChartingUrl) {
            return {
                productId,
                mode: 'mock',
                parseError: null,
                prices: this.generateMockPrices(product),
            };
        }
        const cached = this.cache.get(productId);
        if (!refresh && cached && cached.expires > Date.now()) {
            return cached.data;
        }
        const lastRequest = this.rateLimit.get(productId) || 0;
        if (!refresh && Date.now() - lastRequest < 10000 && cached) {
            return cached.data;
        }
        this.rateLimit.set(productId, Date.now());
        try {
            const parsedPrices = await this.parser.parse(priceChartingUrl);
            const response = {
                productId,
                mode: 'parsed',
                parseError: null,
                prices: parsedPrices,
            };
            this.cache.set(productId, {
                data: response,
                expires: Date.now() + 12 * 60 * 60 * 1000,
            });
            return response;
        }
        catch (error) {
            if (strict) {
                if (error.message.includes('404')) {
                    throw new common_1.NotFoundException(`PriceCharting page not found: ${priceChartingUrl}`);
                }
                throw new common_1.BadGatewayException(`Failed to parse PriceCharting: ${error.message}`);
            }
            return {
                productId,
                mode: 'mock',
                parseError: error.message,
                prices: this.generateMockPrices(product),
            };
        }
    }
    generateMockPrices(product) {
        const hash = this.simpleHash(product.id);
        const basePrice = (hash % 100) + 10;
        const prices = [];
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i * 2);
            const fluctuation = (((hash + i * 13) % 40) - 20) / 100;
            const price = basePrice * (1 + fluctuation);
            const title = `${product.name} ${product.number || ''} ${(hash + i) % 3 === 0 ? 'PSA 10' : 'Near Mint'}`;
            const source = (hash + i) % 2 === 0 ? 'eBay' : 'TCGPlayer';
            const searchTerm = encodeURIComponent(`${product.name} ${product.number || ''}`);
            const link = source === 'eBay'
                ? `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}+sold=1`
                : `https://www.tcgplayer.com/search/all/product?q=${searchTerm}`;
            prices.push({
                date: date.toISOString().split('T')[0],
                title,
                price: parseFloat(price.toFixed(2)),
                source,
                link,
            });
        }
        return prices;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
};
exports.MarketPricingService = MarketPricingService;
exports.MarketPricingService = MarketPricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricecharting_parser_1.PriceChartingParser])
], MarketPricingService);
//# sourceMappingURL=market.service.js.map