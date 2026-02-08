import { MarketPricingService } from './market.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
export declare class MarketPricingController {
    private readonly marketService;
    constructor(marketService: MarketPricingService);
    getProducts(query: GetMarketProductsDto): Promise<{
        items: {
            id: string;
            name: string;
            number: string | null;
            imageUrl: string | null;
            set: string;
            priceChartingUrl: string | null | undefined;
            tcgplayerId: string | null;
            rawPrice: number;
            sealedPrice: number | null;
            grade9Price: number | null;
            grade10Price: number | null;
            lastUpdated: string;
            source: string;
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getSets(): Promise<{
        name: string;
        externalId: string;
        code: string | null;
    }[]>;
    getProductPrices(id: string, strict?: string, refresh?: string): Promise<any>;
}
