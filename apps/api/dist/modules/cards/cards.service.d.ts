import { PrismaService } from '../prisma/prisma.service';
export declare class CardsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCards(query?: string): Promise<{
        id: any;
        name: any;
        set: any;
        rarity: any;
        cardNumber: any;
        imageUrl: any;
        variants: any;
        pricing: {
            rawPrice: number;
            sealedPrice: number | null;
            source: any;
            updatedAt: any;
        } | null;
    }[]>;
    getCard(id: string): Promise<{
        id: any;
        name: any;
        set: any;
        rarity: any;
        cardNumber: any;
        imageUrl: any;
        variants: any;
        pricing: {
            rawPrice: number;
            sealedPrice: number | null;
            source: any;
            updatedAt: any;
        } | null;
    }>;
    listCardVariants(cardId: string): Promise<{
        id: string;
        cardId: string;
        variantType: import("@prisma/client").$Enums.VariantType;
        language: import("@prisma/client").$Enums.Language;
        imageUrl: string;
        name: string;
        setName: string;
        setNumber: string;
    }[]>;
    private transformCard;
}
