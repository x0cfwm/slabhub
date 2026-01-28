import { Injectable, NotFoundException, BadGatewayException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { PriceChartingParser } from './parsers/pricecharting.parser';

@Injectable()
export class MarketPricingService {
    private cache = new Map<string, { data: any; expires: number }>();
    private rateLimit = new Map<string, number>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly parser: PriceChartingParser
    ) { }

    async listProducts(query: GetMarketProductsDto) {
        const { page = 1, limit = 25, search } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { number: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.refProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.refProduct.count({ where }),
        ]);

        const tcgPlayerIds = items.map(i => i.tcgPlayerId).filter((id): id is number => id !== null);
        const pcProducts = await this.prisma.refPriceChartingProduct.findMany({
            where: { tcgPlayerId: { in: tcgPlayerIds } }
        });
        const pcMap = new Map<number, string>(
            pcProducts
                .filter((p): p is typeof p & { tcgPlayerId: number } => p.tcgPlayerId !== null)
                .map(p => [p.tcgPlayerId, p.productUrl])
        );

        const mappedItems = items.map(product => {
            // Mock prices based on ID to be consistent-ish
            const hash = this.simpleHash(product.id);
            const basePrice = (hash % 100) + 10;

            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
                priceChartingUrl: product.tcgPlayerId ? pcMap.get(product.tcgPlayerId) : null,
                tcgplayerId: product.tcgplayerId,
                rawPrice: parseFloat(basePrice.toFixed(2)),
                sealedPrice: hash % 3 === 0 ? parseFloat((basePrice * 4.5).toFixed(2)) : null,
                lastUpdated: new Date().toISOString(),
                source: hash % 2 === 0 ? 'Mock:eBay' : 'Mock:TCGPlayer',
            };
        });

        return {
            items: mappedItems,
            page,
            limit,
            total,
        };
    }

    async getProductPriceHistory(productId: string, strict = false, refresh = false) {
        const product = await this.prisma.refProduct.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Look up PriceCharting URL from RefPriceChartingProduct
        let priceChartingUrl: string | null = null;
        if (product.tcgPlayerId) {
            const pcProduct = await this.prisma.refPriceChartingProduct.findFirst({
                where: { tcgPlayerId: product.tcgPlayerId }
            });
            priceChartingUrl = pcProduct?.productUrl || null;
        }

        // If no URL, return mock
        if (!priceChartingUrl) {
            return {
                productId,
                mode: 'mock' as const,
                parseError: null,
                prices: this.generateMockPrices(product),
            };
        }

        // Check cache
        const cached = this.cache.get(productId);
        if (!refresh && cached && cached.expires > Date.now()) {
            return cached.data;
        }

        // Basic rate limit: 1 request per 10 seconds per product
        const lastRequest = this.rateLimit.get(productId) || 0;
        if (!refresh && Date.now() - lastRequest < 10000 && cached) {
            return cached.data;
        }
        this.rateLimit.set(productId, Date.now());

        try {
            const parsedPrices = await this.parser.parse(priceChartingUrl);

            const response = {
                productId,
                mode: 'parsed' as const,
                parseError: null,
                prices: parsedPrices,
            };

            // Cache for 12 hours
            this.cache.set(productId, {
                data: response,
                expires: Date.now() + 12 * 60 * 60 * 1000,
            });

            return response;
        } catch (error) {
            if (strict) {
                if (error.message.includes('404')) {
                    throw new NotFoundException(`PriceCharting page not found: ${priceChartingUrl}`);
                }
                throw new BadGatewayException(`Failed to parse PriceCharting: ${error.message}`);
            }

            return {
                productId,
                mode: 'mock' as const,
                parseError: error.message,
                prices: this.generateMockPrices(product),
            };
        }
    }

    private generateMockPrices(product: any) {
        const hash = this.simpleHash(product.id);
        const basePrice = (hash % 100) + 10;
        const prices = [];

        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i * 2);

            const fluctuation = (((hash + i * 13) % 40) - 20) / 100;
            const price = basePrice * (1 + fluctuation);
            const title = `${product.name} ${product.number || ''} ${(hash + i) % 3 === 0 ? 'PSA 10' : 'Near Mint'}`;

            const source = (hash + i) % 2 === 0 ? 'eBay' : 'TCGPlayer';
            const searchTerm = encodeURIComponent(`${product.name} ${product.number || ''}`);
            const link = source === 'eBay'
                ? `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}+sold=1`
                : `https://www.tcgplayer.com/search/all/product?q=${searchTerm}`;

            prices.push({
                date: date.toISOString().split('T')[0],
                title,
                price: parseFloat(price.toFixed(2)),
                source,
                link,
            });
        }
        return prices;
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}
