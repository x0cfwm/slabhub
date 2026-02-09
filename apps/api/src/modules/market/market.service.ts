import { Injectable, NotFoundException, BadGatewayException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { PriceChartingParser } from './parsers/pricecharting.parser';

@Injectable()
export class MarketPricingService {
    private cache = new Map<string, { data: any; expires: number }>();
    private rateLimit = new Map<string, number>();

    private readonly logger = new Logger(MarketPricingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly parser: PriceChartingParser
    ) { }

    async listProducts(query: GetMarketProductsDto) {
        const { page = 1, limit = 25, search, setExternalId, productType } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (setExternalId) {
            where.setId = setExternalId;
        }

        if (productType) {
            where.productType = productType;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { cardNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.refPriceChartingProduct.findMany({
                where,
                skip,
                take: limit,
                orderBy: { title: 'asc' },
                include: { set: true }
            }),
            this.prisma.refPriceChartingProduct.count({ where }),
        ]);

        const mappedItems = items.map(product => {
            return {
                id: product.id,
                name: product.title || 'Unknown Product',
                number: product.cardNumber,
                imageUrl: product.imageUrl,
                set: product.set?.name || 'Unknown Set',
                productType: product.productType,
                priceChartingUrl: product.productUrl,
                tcgplayerId: product.tcgPlayerId?.toString(),
                rawPrice: product.rawPrice ? Number(product.rawPrice) : 0,
                grade7Price: product.grade7Price ? Number(product.grade7Price) : null,
                grade8Price: product.grade8Price ? Number(product.grade8Price) : null,
                grade9Price: product.grade9Price ? Number(product.grade9Price) : null,
                grade95Price: product.grade95Price ? Number(product.grade95Price) : null,
                grade10Price: product.grade10Price ? Number(product.grade10Price) : null,
                lastUpdated: product.priceUpdatedAt ? product.priceUpdatedAt.toISOString() : product.updatedAt.toISOString(),
                source: product.priceSource || 'PriceCharting',
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
        const product = await this.prisma.refPriceChartingProduct.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const priceChartingUrl = product.productUrl;

        // If no URL (shouldn't happen with RefPriceChartingProduct but anyway)
        if (!priceChartingUrl) {
            throw new NotFoundException('PriceCharting URL not found for this product.');
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
            const { summary, sales } = await this.parser.parse(priceChartingUrl);

            // Calculate current price from recent history (average of last 5 sales for stability)
            // Or use the 'ungraded' summary price if available
            const recentSales = sales.slice(0, 5);
            let avgPrice = summary.ungraded;

            if (!avgPrice && recentSales.length > 0) {
                avgPrice = recentSales.reduce((acc, p) => acc + p.price, 0) / recentSales.length;
            }

            // Update RefPriceChartingProduct in DB with new prices
            const updateData = {
                rawPrice: avgPrice,
                grade7Price: summary.grade7,
                grade8Price: summary.grade8,
                grade9Price: summary.grade9,
                grade95Price: summary.grade95,
                grade10Price: summary.psa10, // Note: psa10 in summary maps to grade10Price in DB
                priceSource: recentSales[0]?.source || 'PriceCharting',
                priceUpdatedAt: new Date(),
            };

            await this.prisma.refPriceChartingProduct.update({
                where: { id: productId },
                data: updateData
            });

            // Sync to RefProduct if linked by tcgPlayerId
            if (product.tcgPlayerId) {
                await this.prisma.refProduct.updateMany({
                    where: { tcgplayerId: product.tcgPlayerId.toString() },
                    data: updateData
                }).catch(e => this.logger.warn(`Failed to sync prices to RefProduct: ${e.message}`));
            }

            const response = {
                productId,
                mode: 'parsed' as const,
                parseError: null,
                prices: sales,
                summary: summary,
                updatedRawPrice: avgPrice && avgPrice > 0 ? avgPrice : null,
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

    async listSets() {
        const sets = await this.prisma.refPriceChartingSet.findMany({
            orderBy: { name: 'asc' },
        });

        return sets.map((s: any) => ({
            externalId: s.id,
            name: s.name,
            code: s.slug
        }));
    }

}
