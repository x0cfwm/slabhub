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
let MarketPricingService = class MarketPricingService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const mappedItems = items.map(product => {
            const hash = this.simpleHash(product.id);
            const basePrice = (hash % 100) + 10;
            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
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
    async getProductPriceHistory(productId) {
        const product = await this.prisma.refProduct.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const hash = this.simpleHash(product.id);
        const basePrice = (hash % 100) + 10;
        const prices = [];
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i * 2);
            const fluctuation = (((hash + i * 13) % 40) - 20) / 100;
            const price = basePrice * (1 + fluctuation);
            prices.push({
                date: date.toISOString().split('T')[0],
                title: `${product.name} ${product.number || ''} ${(hash + i) % 3 === 0 ? 'PSA 10' : 'Near Mint'}`,
                price: parseFloat(price.toFixed(2)),
                source: (hash + i) % 2 === 0 ? 'eBay' : 'TCGPlayer',
            });
        }
        return {
            productId,
            prices,
        };
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketPricingService);
//# sourceMappingURL=market.service.js.map