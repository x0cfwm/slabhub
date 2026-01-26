import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetMarketProductsDto } from './dto/market-products.dto';

@Injectable()
export class MarketPricingService {
    constructor(private readonly prisma: PrismaService) { }

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

        const mappedItems = items.map(product => {
            // Mock prices based on ID to be consistent-ish
            // Using hash of ID to generate stable-ish mock prices
            const hash = this.simpleHash(product.id);
            const basePrice = (hash % 100) + 10;

            return {
                id: product.id,
                name: product.name,
                number: product.number,
                imageUrl: product.imageUrl,
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

    async getProductPriceHistory(productId: string) {
        const product = await this.prisma.refProduct.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const hash = this.simpleHash(product.id);
        const basePrice = (hash % 100) + 10;
        const prices = [];

        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i * 2);

            // Deterministic fluctuation for "realistic" history based on index and hash
            const fluctuation = (((hash + i * 13) % 40) - 20) / 100; // between -0.2 and 0.2
            const price = basePrice * (1 + fluctuation);

            prices.push({
                date: date.toISOString().split('T')[0],
                title: `${product.name} ${product.number || ''} ${(hash + i) % 3 === 0 ? 'PSA 10' : 'Near Mint'}`,
                price: parseFloat(price.toFixed(2)),
                source: (hash + i) % 2 === 0 ? 'eBay' : 'TCGPlayer',
            });
        }

        return {
            productId,
            prices,
        };
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
