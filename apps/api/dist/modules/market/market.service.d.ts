import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
export declare class MarketPricingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listProducts(query: GetMarketProductsDto): Promise<{
        items: {
            id: string;
            name: string;
            number: string | null;
            imageUrl: string | null;
            rawPrice: number;
            sealedPrice: number | null;
            lastUpdated: string;
            source: string;
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getProductPriceHistory(productId: string): Promise<{
        productId: string;
        prices: {
            date: string;
            title: string;
            price: number;
            source: string;
        }[];
    }>;
    private simpleHash;
}
