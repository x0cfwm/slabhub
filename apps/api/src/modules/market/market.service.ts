import { Injectable, NotFoundException, BadGatewayException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { PriceChartingParser } from './parsers/pricecharting.parser';
import { MediaService } from '../media/media.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class MarketPricingService {
    private cache = new Map<string, { data: any; expires: number }>();
    private rateLimit = new Map<string, number>();

    private readonly logger = new Logger(MarketPricingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly parser: PriceChartingParser,
        private readonly mediaService: MediaService,
        private readonly inventoryService: InventoryService,
    ) { }

    async listProducts(query: GetMarketProductsDto, userId?: string) {
        const { page = 1, limit = 25, search, setExternalId, productType, onlyInInventory } = query;
        const skip = (page - 1) * limit;

        const conditions: any[] = [];

        if (onlyInInventory && userId) {
            conditions.push({
                inventoryItems: {
                    some: {
                        userId: userId
                    }
                }
            });
        }

        if (setExternalId) {
            conditions.push({ setId: setExternalId });
        }

        if (productType) {
            const types = String(productType).split(',').map(t => t.trim()).filter(Boolean);
            if (types.length > 0) {
                conditions.push({ productType: { in: types } });
            }
        }

        if (search) {
            const searchTerms = search.trim().split(/\s+/).filter(Boolean);
            for (const term of searchTerms) {
                conditions.push({
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { set: { name: { contains: term, mode: 'insensitive' } } },
                        { cardNumber: { contains: term, mode: 'insensitive' } }
                    ]
                });
            }
        } else {
            // Only apply price filter if no search is active
            conditions.push({
                OR: [
                    { rawPrice: { gt: 0 } },
                    { sealedPrice: { gt: 0 } }
                ]
            });
        }

        const where = { AND: conditions };


        this.logger.debug(`Listing products with where: ${JSON.stringify(where)}`);

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

        return {
            items: items.map(p => this.mapProduct(p)),
            page,
            limit,
            total,
        };
    }

    async getProduct(id: string) {
        const product = await this.prisma.refPriceChartingProduct.findUnique({
            where: { id },
            include: { set: true }
        });

        if (!product || !(product as any).rawPrice || Number((product as any).rawPrice) <= 0) {
            throw new NotFoundException('Product not found or has no price');
        }

        return this.mapProduct(product);
    }

    private mapProduct(product: any) {
        return {
            id: product.id,
            name: product.title || 'Unknown Product',
            number: product.cardNumber,
            imageUrl: this.mediaService.ensureCdnUrl(product.imageUrl),
            set: product.set?.name || 'Unknown Set',
            productType: product.productType,
            priceChartingUrl: product.productUrl,
            tcgplayerId: product.tcgPlayerId?.toString(),
            rawPrice: product.rawPrice ? Number(product.rawPrice) : 0,
            sealedPrice: product.sealedPrice ? Number(product.sealedPrice) : null,
            grade7Price: product.grade7Price ? Number(product.grade7Price) : null,
            grade8Price: product.grade8Price ? Number(product.grade8Price) : null,
            grade9Price: product.grade9Price ? Number(product.grade9Price) : null,
            grade95Price: product.grade95Price ? Number(product.grade95Price) : null,
            grade10Price: product.grade10Price ? Number(product.grade10Price) : null,
            lastUpdated: product.priceUpdatedAt ? product.priceUpdatedAt.toISOString() : product.updatedAt.toISOString(),
            source: product.priceSource || 'PriceCharting',
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

        // Greedy Scheme: Check stored data first if not refreshing
        if (!refresh) {
            const storedSales = await this.prisma.priceChartingSales.findMany({
                where: { productId },
                orderBy: { date: 'desc' },
                take: 10,
            });

            if (storedSales.length > 0) {
                return {
                    productId,
                    mode: 'stored' as const,
                    parseError: null,
                    prices: storedSales.map(s => ({
                        date: s.date.toISOString().split('T')[0],
                        title: s.title,
                        price: Number(s.price),
                        source: s.source as any,
                        link: s.link,
                        grade: s.grade,
                    })),
                    summary: {
                        ungraded: (product as any).rawPrice ? Number((product as any).rawPrice) : undefined,
                        grade7: (product as any).grade7Price ? Number((product as any).grade7Price) : undefined,
                        grade8: (product as any).grade8Price ? Number((product as any).grade8Price) : undefined,
                        grade9: (product as any).grade9Price ? Number((product as any).grade9Price) : undefined,
                        grade95: (product as any).grade95Price ? Number((product as any).grade95Price) : undefined,
                        psa10: (product as any).grade10Price ? Number((product as any).grade10Price) : undefined,
                    },
                    updatedRawPrice: (product as any).rawPrice ? Number((product as any).rawPrice) : null,
                };
            }
        }

        // Fallback to parsing (or forced refresh)
        // Check cache for non-refresh requests to avoid hitting proxy too often if multiple people open drawer
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

            // Calculate current price from recent history (average of last 3 sales for stability)
            // Or use the 'ungraded' summary price if available
            const recentSales = sales.slice(0, 3);
            let avgPrice = summary.ungraded;

            if (!avgPrice && recentSales.length > 0) {
                avgPrice = recentSales.reduce((acc: number, p: any) => acc + p.price, 0) / recentSales.length;
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
                lastParsedAt: new Date(),
            };

            await this.prisma.refPriceChartingProduct.update({
                where: { id: productId },
                data: updateData
            });

            // Trigger recalulation of inventory snapshots for this product
            this.inventoryService.recalculateMarketPriceSnapshots(productId).catch(err => {
                this.logger.error(`Failed to recalculate snapshots for ${productId}: ${err.message}`);
            });

            // Store sales in DB for future "greedy" access
            if (sales.length > 0) {
                // Archival Logic: Don't delete old sales, just add new unique ones
                const existingSales = await (this.prisma.priceChartingSales as any).findMany({
                    where: { productId },
                    select: { id: true, date: true, title: true, price: true, grade: true }
                });

                const seenIds: string[] = [];
                const newSales: any[] = [];

                for (const s of sales) {
                    const saleDate = new Date(s.date);
                    const existing = existingSales.find((e: any) =>
                        e.date.getTime() === saleDate.getTime() &&
                        e.title === s.title &&
                        Number(e.price) === s.price &&
                        e.grade === (s.grade || null)
                    );

                    if (existing) {
                        seenIds.push(existing.id);
                    } else {
                        newSales.push({
                            productId,
                            date: saleDate,
                            title: s.title,
                            price: s.price,
                            source: s.source,
                            link: s.link,
                            grade: s.grade,
                            lastSeenAt: new Date(),
                        });
                    }
                }

                if (seenIds.length > 0) {
                    await (this.prisma.priceChartingSales as any).updateMany({
                        where: { id: { in: seenIds } },
                        data: { lastSeenAt: new Date() }
                    });
                }

                if (newSales.length > 0) {
                    await (this.prisma.priceChartingSales as any).createMany({
                        data: newSales
                    });
                }
            }

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
