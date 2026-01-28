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

        const tcgPlayerIds = items
            .map(i => i.tcgplayerId ? parseInt(i.tcgplayerId) : null)
            .filter((id): id is number => id !== null && !isNaN(id));

        const pcProducts = await this.prisma.refPriceChartingProduct.findMany({
            where: { tcgPlayerId: { in: tcgPlayerIds } }
        });
        const pcMap = new Map<number, string>(
            pcProducts
                .filter((p): p is typeof p & { tcgPlayerId: number } => p.tcgPlayerId !== null)
                .map(p => [p.tcgPlayerId, p.productUrl])
        );

        const mappedItems = items.map(product => {
            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
                priceChartingUrl: product.tcgplayerId ? pcMap.get(parseInt(product.tcgplayerId)) : null,
                tcgplayerId: product.tcgplayerId,
                rawPrice: product.rawPrice ? Number(product.rawPrice) : 0,
                sealedPrice: product.sealedPrice ? Number(product.sealedPrice) : null,
                lastUpdated: product.priceUpdatedAt ? product.priceUpdatedAt.toISOString() : product.updatedAt.toISOString(),
                source: product.priceSource || 'RefProduct',
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
        if (product.tcgplayerId) {
            const tcgId = parseInt(product.tcgplayerId);
            if (!isNaN(tcgId)) {
                const pcProduct = await this.prisma.refPriceChartingProduct.findFirst({
                    where: { tcgPlayerId: tcgId }
                });
                priceChartingUrl = pcProduct?.productUrl || null;
            }
        }

        // If no URL, we can't fetch live data
        if (!priceChartingUrl) {
            throw new NotFoundException('PriceCharting URL not found for this product. Link it first.');
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

            // Calculate current price from recent history (average of last 5 sales for stability)
            const recentSales = parsedPrices.slice(0, 5);
            const avgPrice = recentSales.length > 0
                ? recentSales.reduce((acc, p) => acc + p.price, 0) / recentSales.length
                : 0;

            // Update product in DB with new price
            if (avgPrice > 0) {
                await this.prisma.refProduct.update({
                    where: { id: productId },
                    data: {
                        rawPrice: avgPrice,
                        priceSource: recentSales[0]?.source || 'PriceCharting',
                        priceUpdatedAt: new Date(),
                    }
                });
            }

            const response = {
                productId,
                mode: 'parsed' as const,
                parseError: null,
                prices: parsedPrices,
                updatedRawPrice: avgPrice > 0 ? avgPrice : null,
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

            throw new BadGatewayException(`Failed to fetch pricing: ${error.message}`);
        }
    }

}
