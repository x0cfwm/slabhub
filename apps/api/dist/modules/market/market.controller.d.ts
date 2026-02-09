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
            productType: string | null;
            priceChartingUrl: string;
            tcgplayerId: string | undefined;
            rawPrice: number;
            sealedPrice: number | null;
            grade7Price: number | null;
            grade8Price: number | null;
            grade9Price: number | null;
            grade95Price: number | null;
            grade10Price: number | null;
            lastUpdated: string;
            source: string;
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getSets(): Promise<{
        externalId: any;
        name: any;
        code: any;
    }[]>;
    getProductPrices(id: string, strict?: string, refresh?: string): Promise<any>;
}
