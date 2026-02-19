import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { MediaService } from '../media/media.service';

@Injectable()
export class CardsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mediaService: MediaService,
    ) { }

    async listCards(query?: string) {
        const where = query
            ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' as const } },
                    { cardNumber: { contains: query, mode: 'insensitive' as const } },
                    { set: { contains: query, mode: 'insensitive' as const } },
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

    async getCard(id: string) {
        const card = await this.prisma.cardProfile.findUnique({
            where: { id },
            include: {
                cardVariants: true,
                pricingSnapshot: true,
            },
        });

        if (!card) {
            throw new NotFoundException(`Card with ID ${id} not found`);
        }

        return this.transformCard(card);
    }

    async listCardVariants(cardId: string) {
        const variants = await this.prisma.cardVariant.findMany({
            where: { cardId },
            orderBy: [{ variantType: 'asc' }, { language: 'asc' }],
        });

        return variants.map((v) => ({
            id: v.id,
            cardId: v.cardId,
            variantType: v.variantType,
            language: v.language,
            imageUrl: this.mediaService.ensureCdnUrl(v.imageUrl),
            name: v.name,
            setName: v.setName,
            setNumber: v.setNumber,
        }));
    }

    private transformCard(card: any) {
        return {
            id: card.id,
            name: card.name,
            set: card.set,
            rarity: card.rarity,
            cardNumber: card.cardNumber,
            imageUrl: this.mediaService.ensureCdnUrl(card.imageUrl),
            variants: card.cardVariants?.map((v: any) => ({
                id: v.id,
                variantType: v.variantType,
                language: v.language,
                imageUrl: this.mediaService.ensureCdnUrl(v.imageUrl),
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
}
