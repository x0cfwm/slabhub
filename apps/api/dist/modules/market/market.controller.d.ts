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
            priceChartingUrl: string | null;
            tcgplayerId: string | null;
            rawPrice: number;
            sealedPrice: number | null;
            lastUpdated: string;
            source: string;
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getProductPrices(id: string, strict?: string, refresh?: string): Promise<any>;
}
