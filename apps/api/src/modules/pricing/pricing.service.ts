import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
    constructor(private readonly prisma: PrismaService) { }

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
        // Get all pricing snapshots
        const snapshots = await this.prisma.pricingSnapshot.findMany();

        // Update each with random price variation (simulating external API refresh)
        const updates = await Promise.all(
            snapshots.map(async (snapshot) => {
                const rawVariation = (Math.random() - 0.5) * 10; // +/- $5
                const newRawPrice = Math.max(1, Number(snapshot.rawPrice) + rawVariation);

                let newSealedPrice: number | null = null;
                if (snapshot.sealedPrice) {
                    const sealedVariation = (Math.random() - 0.5) * 20; // +/- $10
                    newSealedPrice = Math.max(1, Number(snapshot.sealedPrice) + sealedVariation);
                }

                return this.prisma.pricingSnapshot.update({
                    where: { id: snapshot.id },
                    data: {
                        rawPrice: newRawPrice,
                        sealedPrice: newSealedPrice,
                        source: Math.random() > 0.5 ? 'Mock:eBay' : 'Mock:TCGPlayer',
                        // updatedAt is auto-updated
                    },
                    include: {
                        cardProfile: true,
                    },
                });
            }),
        );

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

    async getPricingForCard(cardProfileId: string) {
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
}
