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
        const { page = 1, limit = 25, search, onlyLinked = false, setExternalId } = query;
        const skip = (page - 1) * limit;
        const pcMappings = await this.prisma.refPriceChartingProduct.findMany({
            where: { tcgPlayerId: { not: null } },
            select: { tcgPlayerId: true, productUrl: true }
        });
        const pcMap = new Map();
        pcMappings.forEach((p) => {
            if (p.tcgPlayerId)
                pcMap.set(p.tcgPlayerId.toString(), p.productUrl);
        });
        const sets = await this.prisma.refSet.findMany({
            select: { externalId: true, name: true, code: true }
        });
        const setMap = new Map();
        const setCodeMap = new Map();
        sets.forEach(s => {
            setMap.set(s.externalId, s.name);
            if (s.code)
                setCodeMap.set(s.code.toUpperCase(), s.name);
        });
        const where = {};
        if (onlyLinked) {
            const validTcgIds = Array.from(pcMap.keys());
            where.tcgplayerId = { in: validTcgIds };
        }
        if (setExternalId) {
            where.setExternalId = setExternalId;
        }
        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { number: { contains: search, mode: 'insensitive' } },
                    ]
                }
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
        const mappedItems = items.map(product => {
            let setName = 'Unknown Set';
            if (product.setExternalId) {
                setName = setMap.get(product.setExternalId) ||
                    setCodeMap.get(product.setExternalId.toUpperCase()) ||
                    'Unknown Set';
            }
            if (setName === 'Unknown Set' && product.number) {
                const codeFromNumber = product.number.split('-')[0]?.toUpperCase();
                if (codeFromNumber) {
                    setName = setCodeMap.get(codeFromNumber) || 'Unknown Set';
                }
            }
            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
                set: setName,
                priceChartingUrl: product.tcgplayerId ? pcMap.get(product.tcgplayerId) : null,
                tcgplayerId: product.tcgplayerId,
                rawPrice: product.rawPrice ? Number(product.rawPrice) : 0,
                sealedPrice: product.sealedPrice ? Number(product.sealedPrice) : null,
                lastUpdated: product.priceUpdatedAt ? product.priceUpdatedAt.toISOString() : product.updatedAt.toISOString(),
                source: product.priceSource || 'RefProduct',
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
        if (product.tcgplayerId) {
            const tcgId = parseInt(product.tcgplayerId);
            if (!isNaN(tcgId)) {
                const pcProduct = await this.prisma.refPriceChartingProduct.findFirst({
                    where: { tcgPlayerId: tcgId }
                });
                priceChartingUrl = pcProduct?.productUrl || null;
            }
        }
        if (!priceChartingUrl) {
            throw new common_1.NotFoundException('PriceCharting URL not found for this product. Link it first.');
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
            const recentSales = parsedPrices.slice(0, 5);
            const avgPrice = recentSales.length > 0
                ? recentSales.reduce((acc, p) => acc + p.price, 0) / recentSales.length
                : 0;
            if (avgPrice > 0) {
                await this.prisma.refProduct.update({
                    where: { id: productId },
                    data: {
                        rawPrice: avgPrice,
                        priceSource: recentSales[0]?.source || 'PriceCharting',
                        priceUpdatedAt: new Date(),
                    }
                });
            }
            const response = {
                productId,
                mode: 'parsed',
                parseError: null,
                prices: parsedPrices,
                updatedRawPrice: avgPrice > 0 ? avgPrice : null,
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
        return this.prisma.refSet.findMany({
            orderBy: { name: 'asc' },
            select: {
                externalId: true,
                name: true,
                code: true,
            },
        });
    }
};
exports.MarketPricingService = MarketPricingService;
exports.MarketPricingService = MarketPricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricecharting_parser_1.PriceChartingParser])
], MarketPricingService);
//# sourceMappingURL=market.service.js.map