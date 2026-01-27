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
exports.CardsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CardsService = class CardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listCards(query) {
        const where = query
            ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { cardNumber: { contains: query, mode: 'insensitive' } },
                    { set: { contains: query, mode: 'insensitive' } },
                ],
            }
            : {};
        const cards = await this.prisma.cardProfile.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                cardVariants: true,
            },
        });
        return cards.map((card) => this.transformCard(card));
    }
    async getCard(id) {
        const card = await this.prisma.cardProfile.findUnique({
            where: { id },
            include: {
                cardVariants: true,
                pricingSnapshot: true,
            },
        });
        if (!card) {
            throw new common_1.NotFoundException(`Card with ID ${id} not found`);
        }
        return this.transformCard(card);
    }
    async listCardVariants(cardId) {
        const variants = await this.prisma.cardVariant.findMany({
            where: { cardId },
            orderBy: [{ variantType: 'asc' }, { language: 'asc' }],
        });
        return variants.map((v) => ({
            id: v.id,
            cardId: v.cardId,
            variantType: v.variantType,
            language: v.language,
            imageUrl: v.imageUrl,
            name: v.name,
            setName: v.setName,
            setNumber: v.setNumber,
        }));
    }
    transformCard(card) {
        return {
            id: card.id,
            name: card.name,
            set: card.set,
            rarity: card.rarity,
            cardNumber: card.cardNumber,
            imageUrl: card.imageUrl,
            variants: card.cardVariants?.map((v) => ({
                id: v.id,
                variantType: v.variantType,
                language: v.language,
                imageUrl: v.imageUrl,
            })),
            pricing: card.pricingSnapshot
                ? {
                    rawPrice: Number(card.pricingSnapshot.rawPrice),
                    sealedPrice: card.pricingSnapshot.sealedPrice
                        ? Number(card.pricingSnapshot.sealedPrice)
                        : null,
                    source: card.pricingSnapshot.source,
                    updatedAt: card.pricingSnapshot.updatedAt.toISOString(),
                }
                : null,
        };
    }
};
exports.CardsService = CardsService;
exports.CardsService = CardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CardsService);
//# sourceMappingURL=cards.service.js.map