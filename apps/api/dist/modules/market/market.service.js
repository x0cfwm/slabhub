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
var MarketPricingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricecharting_parser_1 = require("./parsers/pricecharting.parser");
let MarketPricingService = MarketPricingService_1 = class MarketPricingService {
    constructor(prisma, parser) {
        this.prisma = prisma;
        this.parser = parser;
        this.cache = new Map();
        this.rateLimit = new Map();
        this.logger = new common_1.Logger(MarketPricingService_1.name);
    }
    async listProducts(query) {
        const { page = 1, limit = 25, search, setExternalId, productType } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (setExternalId) {
            where.setId = setExternalId;
        }
        if (productType) {
            where.productType = productType;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { cardNumber: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.refPriceChartingProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { title: 'asc' },
                include: { set: true }
            }),
            this.prisma.refPriceChartingProduct.count({ where }),
        ]);
        return {
            items: items.map(p => this.mapProduct(p)),
            page,
            limit,
            total,
        };
    }
    async getProduct(id) {
        const product = await this.prisma.refPriceChartingProduct.findUnique({
            where: { id },
            include: { set: true }
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return this.mapProduct(product);
    }
    mapProduct(product) {
        return {
            id: product.id,
            name: product.title || 'Unknown Product',
            number: product.cardNumber,
            imageUrl: product.imageUrl,
            set: product.set?.name || 'Unknown Set',
            productType: product.productType,
            priceChartingUrl: product.productUrl,
            tcgplayerId: product.tcgPlayerId?.toString(),
            rawPrice: product.rawPrice ? Number(product.rawPrice) : 0,
            sealedPrice: product.sealedPrice ? Number(product.sealedPrice) : null,
            grade7Price: product.grade7Price ? Number(product.grade7Price) : null,
            grade8Price: product.grade8Price ? Number(product.grade8Price) : null,
            grade9Price: product.grade9Price ? Number(product.grade9Price) : null,
            grade95Price: product.grade95Price ? Number(product.grade95Price) : null,
            grade10Price: product.grade10Price ? Number(product.grade10Price) : null,
            lastUpdated: product.priceUpdatedAt ? product.priceUpdatedAt.toISOString() : product.updatedAt.toISOString(),
            source: product.priceSource || 'PriceCharting',
        };
    }
    async getProductPriceHistory(productId, strict = false, refresh = false) {
        const product = await this.prisma.refPriceChartingProduct.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const priceChartingUrl = product.productUrl;
        if (!priceChartingUrl) {
            throw new common_1.NotFoundException('PriceCharting URL not found for this product.');
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
            const { summary, sales } = await this.parser.parse(priceChartingUrl);
            const recentSales = sales.slice(0, 5);
            let avgPrice = summary.ungraded;
            if (!avgPrice && recentSales.length > 0) {
                avgPrice = recentSales.reduce((acc, p) => acc + p.price, 0) / recentSales.length;
            }
            const updateData = {
                rawPrice: avgPrice,
                grade7Price: summary.grade7,
                grade8Price: summary.grade8,
                grade9Price: summary.grade9,
                grade95Price: summary.grade95,
                grade10Price: summary.psa10,
                priceSource: recentSales[0]?.source || 'PriceCharting',
                priceUpdatedAt: new Date(),
            };
            await this.prisma.refPriceChartingProduct.update({
                where: { id: productId },
                data: updateData
            });
            if (product.tcgPlayerId) {
                await this.prisma.refProduct.updateMany({
                    where: { tcgplayerId: product.tcgPlayerId.toString() },
                    data: updateData
                }).catch(e => this.logger.warn(`Failed to sync prices to RefProduct: ${e.message}`));
            }
            const response = {
                productId,
                mode: 'parsed',
                parseError: null,
                prices: sales,
                summary: summary,
                updatedRawPrice: avgPrice && avgPrice > 0 ? avgPrice : null,
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
            throw new common_1.BadGatewayException(`Failed to fetch pricing: ${error.message}`);
        }
    }
    async listSets() {
        const sets = await this.prisma.refPriceChartingSet.findMany({
            orderBy: { name: 'asc' },
        });
        return sets.map((s) => ({
            externalId: s.id,
            name: s.name,
            code: s.slug
        }));
    }
};
exports.MarketPricingService = MarketPricingService;
exports.MarketPricingService = MarketPricingService = MarketPricingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricecharting_parser_1.PriceChartingParser])
], MarketPricingService);
//# sourceMappingURL=market.service.js.map