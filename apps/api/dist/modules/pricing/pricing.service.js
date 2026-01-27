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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingService = class PricingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPricing() {
        const snapshots = await this.prisma.pricingSnapshot.findMany({
            include: {
                cardProfile: true,
            },
            orderBy: { cardProfileId: 'asc' },
        });
        return snapshots.map((s) => ({
            cardProfileId: s.cardProfileId,
            rawPrice: Number(s.rawPrice),
            sealedPrice: s.sealedPrice ? Number(s.sealedPrice) : null,
            source: s.source,
            updatedAt: s.updatedAt.toISOString(),
            cardProfile: {
                id: s.cardProfile.id,
                name: s.cardProfile.name,
                set: s.cardProfile.set,
                rarity: s.cardProfile.rarity,
                cardNumber: s.cardProfile.cardNumber,
                imageUrl: s.cardProfile.imageUrl,
            },
        }));
    }
    async refreshPricing() {
        const snapshots = await this.prisma.pricingSnapshot.findMany();
        const updates = await Promise.all(snapshots.map(async (snapshot) => {
            const rawVariation = (Math.random() - 0.5) * 10;
            const newRawPrice = Math.max(1, Number(snapshot.rawPrice) + rawVariation);
            let newSealedPrice = null;
            if (snapshot.sealedPrice) {
                const sealedVariation = (Math.random() - 0.5) * 20;
                newSealedPrice = Math.max(1, Number(snapshot.sealedPrice) + sealedVariation);
            }
            return this.prisma.pricingSnapshot.update({
                where: { id: snapshot.id },
                data: {
                    rawPrice: newRawPrice,
                    sealedPrice: newSealedPrice,
                    source: Math.random() > 0.5 ? 'Mock:eBay' : 'Mock:TCGPlayer',
                },
                include: {
                    cardProfile: true,
                },
            });
        }));
        return updates.map((s) => ({
            cardProfileId: s.cardProfileId,
            rawPrice: Number(s.rawPrice),
            sealedPrice: s.sealedPrice ? Number(s.sealedPrice) : null,
            source: s.source,
            updatedAt: s.updatedAt.toISOString(),
            cardProfile: {
                id: s.cardProfile.id,
                name: s.cardProfile.name,
                set: s.cardProfile.set,
                rarity: s.cardProfile.rarity,
                cardNumber: s.cardProfile.cardNumber,
                imageUrl: s.cardProfile.imageUrl,
            },
        }));
    }
    async getPricingForCard(cardProfileId) {
        const snapshot = await this.prisma.pricingSnapshot.findUnique({
            where: { cardProfileId },
            include: {
                cardProfile: true,
            },
        });
        if (!snapshot) {
            return null;
        }
        return {
            cardProfileId: snapshot.cardProfileId,
            rawPrice: Number(snapshot.rawPrice),
            sealedPrice: snapshot.sealedPrice ? Number(snapshot.sealedPrice) : null,
            source: snapshot.source,
            updatedAt: snapshot.updatedAt.toISOString(),
        };
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map