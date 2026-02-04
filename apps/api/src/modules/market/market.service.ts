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
        const { page = 1, limit = 25, search, onlyLinked = false, setExternalId } = query;
        const skip = (page - 1) * limit;

        // 1. Get mappings from RefPriceChartingProduct
        const pcMappings = await this.prisma.refPriceChartingProduct.findMany({
            where: { tcgPlayerId: { not: null } },
            select: { tcgPlayerId: true, productUrl: true }
        });

        const pcMap = new Map<string, string>();
        pcMappings.forEach((p: { tcgPlayerId: number | null; productUrl: string }) => {
            if (p.tcgPlayerId) pcMap.set(p.tcgPlayerId.toString(), p.productUrl);
        });

        // 2. Get all sets for name mapping
        const sets = await this.prisma.refSet.findMany({
            select: { externalId: true, name: true, code: true }
        });
        const setMap = new Map<string, string>();
        const setCodeMap = new Map<string, string>();
        sets.forEach(s => {
            setMap.set(s.externalId, s.name);
            if (s.code) setCodeMap.set(s.code.toUpperCase(), s.name);
        });

        const where: any = {};

        if (onlyLinked) {
            const validTcgIds = Array.from(pcMap.keys());
            where.tcgplayerId = { in: validTcgIds };
        }

        if (setExternalId) {
            where.setExternalId = setExternalId;
        }

        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { number: { contains: search, mode: 'insensitive' } },
                    ]
                }
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

        const mappedItems = items.map(product => {
            // Try to resolve set name:
            // 1. By setExternalId (ID match)
            // 2. By setExternalId (Code match - sometimes IDs are codes)
            // 3. Fallback: Parse code from number (e.g. EB01 from EB01-017)
            let setName = 'Unknown Set';
            if (product.setExternalId) {
                setName = setMap.get(product.setExternalId) ||
                    setCodeMap.get(product.setExternalId.toUpperCase()) ||
                    'Unknown Set';
            }

            if (setName === 'Unknown Set' && product.number) {
                const codeFromNumber = product.number.split('-')[0]?.toUpperCase();
                if (codeFromNumber) {
                    setName = setCodeMap.get(codeFromNumber) || 'Unknown Set';
                }
            }

            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
                set: setName,
                priceChartingUrl: product.tcgplayerId ? pcMap.get(product.tcgplayerId) : null,
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

    async listSets() {
        return this.prisma.refSet.findMany({
            orderBy: { name: 'asc' },
            select: {
                externalId: true,
                name: true,
                code: true,
            },
        });
    }

}
