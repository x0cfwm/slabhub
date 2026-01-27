import { PricingService } from './pricing.service';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
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
}
