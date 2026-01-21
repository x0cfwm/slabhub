import { CardsService } from './cards.service';
import { QueryCardsDto } from './dto/query-cards.dto';
export declare class CardsController {
    private readonly cardsService;
    constructor(cardsService: CardsService);
    listCards(dto: QueryCardsDto): Promise<{
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
    getCardVariants(id: string): Promise<{
        id: string;
        cardId: string;
        variantType: import("@prisma/client").$Enums.VariantType;
        language: import("@prisma/client").$Enums.Language;
        imageUrl: string;
        name: string;
        setName: string;
        setNumber: string;
    }[]>;
}
