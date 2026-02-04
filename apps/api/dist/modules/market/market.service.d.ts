import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { PriceChartingParser } from './parsers/pricecharting.parser';
export declare class MarketPricingService {
    private readonly prisma;
    private readonly parser;
    private cache;
    private rateLimit;
    constructor(prisma: PrismaService, parser: PriceChartingParser);
    listProducts(query: GetMarketProductsDto): Promise<{
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
            lastUpdated: string;
            source: string;
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getProductPriceHistory(productId: string, strict?: boolean, refresh?: boolean): Promise<any>;
    listSets(): Promise<{
        externalId: string;
        name: string;
        code: string | null;
    }[]>;
}
