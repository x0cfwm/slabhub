import { MarketPricingService } from './market.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
export declare class MarketPricingController {
    private readonly marketService;
    constructor(marketService: MarketPricingService);
    getProducts(query: GetMarketProductsDto, userId: string | undefined): Promise<{
        items: {
            id: any;
            name: any;
            number: any;
            imageUrl: any;
            set: any;
            productType: any;
            priceChartingUrl: any;
            tcgplayerId: any;
            rawPrice: number;
            sealedPrice: number | null;
            grade7Price: number | null;
            grade8Price: number | null;
            grade9Price: number | null;
            grade95Price: number | null;
            grade10Price: number | null;
            lastUpdated: any;
            source: any;
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
    getProduct(id: string): Promise<{
        id: any;
        name: any;
        number: any;
        imageUrl: any;
        set: any;
        productType: any;
        priceChartingUrl: any;
        tcgplayerId: any;
        rawPrice: number;
        sealedPrice: number | null;
        grade7Price: number | null;
        grade8Price: number | null;
        grade9Price: number | null;
        grade95Price: number | null;
        grade10Price: number | null;
        lastUpdated: any;
        source: any;
    }>;
}
