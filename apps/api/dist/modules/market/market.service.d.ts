import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { PriceChartingParser } from './parsers/pricecharting.parser';
export declare class MarketPricingService {
    private readonly prisma;
    private readonly parser;
    private cache;
    private rateLimit;
    private readonly logger;
    constructor(prisma: PrismaService, parser: PriceChartingParser);
    listProducts(query: GetMarketProductsDto): Promise<{
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
    getProductPriceHistory(productId: string, strict?: boolean, refresh?: boolean): Promise<any>;
    listSets(): Promise<{
        externalId: any;
        name: any;
        code: any;
    }[]>;
}
