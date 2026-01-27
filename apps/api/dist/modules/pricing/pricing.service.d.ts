import { PrismaService } from '../prisma/prisma.service';
export declare class PricingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listPricing(): Promise<{
        cardProfileId: string;
        rawPrice: number;
        sealedPrice: number | null;
        source: string;
        updatedAt: string;
        cardProfile: {
            id: string;
            name: string;
            set: string;
            rarity: string;
            cardNumber: string;
            imageUrl: string;
        };
    }[]>;
    refreshPricing(): Promise<{
        cardProfileId: string;
        rawPrice: number;
        sealedPrice: number | null;
        source: string;
        updatedAt: string;
        cardProfile: {
            id: string;
            name: string;
            set: string;
            rarity: string;
            cardNumber: string;
            imageUrl: string;
        };
    }[]>;
    getPricingForCard(cardProfileId: string): Promise<{
        cardProfileId: string;
        rawPrice: number;
        sealedPrice: number | null;
        source: string;
        updatedAt: string;
    } | null>;
}
