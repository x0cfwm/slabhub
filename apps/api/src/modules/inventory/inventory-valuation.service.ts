import { Injectable, Logger } from '@nestjs/common';
import { InventoryStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface InventoryPriceSnapshotUpdate {
    id: string;
    oldPrice: number | null;
    newPrice: number | null;
    lastSaleDate: string | null;
}

@Injectable()
export class InventoryValuationService {
    private readonly logger = new Logger(InventoryValuationService.name);
    private readonly marketPriceCache = new Map<string, number | null>();

    constructor(private readonly prisma: PrismaService) { }

    clearCache() {
        this.marketPriceCache.clear();
    }

    async getMarketValueHistory(userId: string, days: number = 90) {
        const items = await this.prisma.inventoryItem.findMany({
            where: {
                userId,
                stage: { notIn: [InventoryStage.ARCHIVED] }
            },
            include: {
                refPriceChartingProduct: {
                    include: {
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 50,
                        },
                    },
                },
            }
        });

        const productIds = items
            .map(i => i.refPriceChartingProductId)
            .filter((id): id is string => !!id);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const sales = productIds.length > 0 ? await this.prisma.priceChartingSales.findMany({
            where: {
                productId: { in: productIds },
                date: { gte: startDate }
            },
            orderBy: { date: 'asc' }
        }) : [];

        const salesByProductAndDate: Record<string, Record<string, any[]>> = {};
        sales.forEach(sale => {
            const dateStr = sale.date.toISOString().split('T')[0];
            if (!salesByProductAndDate[sale.productId]) {
                salesByProductAndDate[sale.productId] = {};
            }
            if (!salesByProductAndDate[sale.productId][dateStr]) {
                salesByProductAndDate[sale.productId][dateStr] = [];
            }
            salesByProductAndDate[sale.productId][dateStr].push(sale);
        });

        const history = [];
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const itemsWithAcqDate = items.map(item => ({
            ...item,
            acqDate: item.acquisitionDate ? new Date(item.acquisitionDate) : new Date(item.createdAt)
        }));

        const lastKnownPrices: Record<string, number> = {};

        for (let i = days; i >= 0; i--) {
            const currentDate = new Date(now);
            currentDate.setDate(now.getDate() - i);
            currentDate.setHours(23, 59, 59, 999);
            const dateStr = currentDate.toISOString().split('T')[0];

            let totalMarketValue = 0;
            let totalCost = 0;
            let totalCount = 0;
            let totalSoldRevenue = 0;
            let totalSoldCost = 0;
            let totalSoldCount = 0;

            itemsWithAcqDate.forEach(item => {
                if (item.acqDate > currentDate) return;

                const qty = item.quantity || 1;
                const acqCost = (Number(item.acquisitionPrice) || 0) * qty;
                const isSoldItem = item.stage === InventoryStage.SOLD && item.soldDate;
                const isSoldByThisDate = isSoldItem && new Date(item.soldDate!) <= currentDate;

                if (isSoldByThisDate) {
                    totalSoldRevenue += (Number(item.soldPrice) || 0) * qty;
                    totalSoldCost += acqCost;
                    totalSoldCount += qty;
                    return;
                }

                totalCost += acqCost;
                totalCount += qty;

                let itemPrice = 0;
                const cacheKey = `${item.refPriceChartingProductId}_${item.itemType}_${item.gradeValue}`;

                if (item.refPriceChartingProductId) {
                    const daySales = salesByProductAndDate[item.refPriceChartingProductId]?.[dateStr] || [];

                    if (daySales.length > 0) {
                        const filteredSales = this.filterSalesByItemType(daySales, item);
                        if (filteredSales.length > 0) {
                            const dayAvg = filteredSales.reduce((sum: number, s: any) => sum + Number(s.price), 0) / filteredSales.length;
                            lastKnownPrices[cacheKey] = dayAvg;
                            itemPrice = dayAvg;
                        }
                    }
                }

                const dynamicPrice = this.getMarketPrice(item);
                const snapshotPrice = Number(item.marketPriceSnapshot);
                const acqPrice = Number(item.acquisitionPrice);

                if (i === 0) {
                    itemPrice = dynamicPrice || snapshotPrice || acqPrice || 0;
                } else if (itemPrice === 0) {
                    itemPrice = lastKnownPrices[cacheKey] || dynamicPrice || snapshotPrice || acqPrice || 0;
                }

                totalMarketValue += itemPrice * qty;
            });

            const realizedPnl = totalSoldRevenue - totalSoldCost;
            const unrealizedPnl = totalMarketValue - totalCost;

            history.push({
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                value: Math.round(totalMarketValue),
                cost: Math.round(totalCost),
                count: totalCount,
                soldRevenue: Math.round(totalSoldRevenue),
                soldCost: Math.round(totalSoldCost),
                soldCount: totalSoldCount,
                realizedPnl: Math.round(realizedPnl),
                unrealizedPnl: Math.round(unrealizedPnl),
                totalPnl: Math.round(realizedPnl + unrealizedPnl),
            });
        }

        return history;
    }

    async syncAllMarketPriceSnapshots() {
        const items = await this.prisma.inventoryItem.findMany({
            where: {
                refPriceChartingProductId: { not: null },
                stage: { notIn: [InventoryStage.ARCHIVED] }
            },
            select: {
                refPriceChartingProductId: true
            },
            distinct: ['refPriceChartingProductId']
        });

        const productIds = items
            .map(i => i.refPriceChartingProductId)
            .filter((id): id is string => !!id);

        this.logger.log(`Syncing market price snapshots for ${productIds.length} unique products...`);
        const allUpdates: InventoryPriceSnapshotUpdate[] = [];

        for (const productId of productIds) {
            try {
                const updates = await this.recalculateMarketPriceSnapshots(productId);
                allUpdates.push(...updates);
            } catch (error) {
                this.logger.error(`Failed to sync snapshots for product ${productId}: ${error.message}`);
            }
        }

        this.logger.log('Market price snapshots sync completed.');
        return allUpdates;
    }

    async recalculateMarketPriceSnapshots(productId: string) {
        const items = await this.prisma.inventoryItem.findMany({
            where: {
                refPriceChartingProductId: productId,
                stage: { notIn: [InventoryStage.ARCHIVED] }
            },
            include: {
                refPriceChartingProduct: {
                    include: {
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 50,
                        },
                    },
                },
            }
        });

        if (items.length === 0) return [];

        const updates: InventoryPriceSnapshotUpdate[] = [];
        this.marketPriceCache.clear();

        for (const item of items) {
            const currentPrice = this.getMarketPrice(item);
            const oldPrice = item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null;

            let lastSaleDate = null;
            if (item.refPriceChartingProduct?.sales && Array.isArray(item.refPriceChartingProduct.sales) && item.refPriceChartingProduct.sales.length > 0) {
                const filteredSales = this.filterSalesByItemType(item.refPriceChartingProduct.sales, item);
                if (filteredSales.length > 0) {
                    lastSaleDate = filteredSales[0].date?.toISOString() || null;
                }
            }

            if (currentPrice !== oldPrice) {
                await this.prisma.inventoryItem.update({
                    where: { id: item.id },
                    data: { marketPriceSnapshot: currentPrice }
                });
                updates.push({ id: item.id, oldPrice, newPrice: currentPrice ?? null, lastSaleDate });
            }
        }
        return updates;
    }

    getMarketPrice(item: any) {
        if (!item.refPriceChartingProduct) return null;

        const cacheKey = `${item.refPriceChartingProduct.id}_${item.itemType}_${item.gradeValue}`;
        if (this.marketPriceCache.has(cacheKey)) {
            return this.marketPriceCache.get(cacheKey);
        }

        const ref = item.refPriceChartingProduct;
        const sales = ref.sales || [];

        if (item.itemType === 'SEALED_PRODUCT') {
            return ref.sealedPrice ? Number(ref.sealedPrice) : null;
        }

        const getAverageOf3 = (filteredSales: any[]) => {
            if (filteredSales.length === 0) return null;
            const last3 = filteredSales.slice(0, 3);
            const sum = last3.reduce((acc, s) => acc + Number(s.price), 0);
            return sum / last3.length;
        };

        if (item.itemType === 'SINGLE_CARD_GRADED') {
            const gradeStr = String(item.gradeValue || '').toLowerCase();
            const gradedSales = sales.filter((s: any) => s.grade?.toLowerCase().includes(gradeStr));
            const gradedAvg = getAverageOf3(gradedSales);
            if (gradedAvg !== null) {
                this.marketPriceCache.set(cacheKey, gradedAvg);
                return gradedAvg;
            }

            const numericGrade = gradeStr.match(/\d+(\.\d+)?/)?.[0];
            let fallbackPrice: number | null = null;

            if (numericGrade === '10' && ref.grade10Price) fallbackPrice = Number(ref.grade10Price);
            else if (numericGrade === '9.5' && ref.grade95Price) fallbackPrice = Number(ref.grade95Price);
            else if (numericGrade === '9' && ref.grade9Price) fallbackPrice = Number(ref.grade9Price);
            else if (numericGrade === '8' && ref.grade8Price) fallbackPrice = Number(ref.grade8Price);
            else if (numericGrade === '7' && ref.grade7Price) fallbackPrice = Number(ref.grade7Price);

            if (fallbackPrice !== null) {
                this.marketPriceCache.set(cacheKey, fallbackPrice);
                return fallbackPrice;
            }

            const rawSales = sales.filter((s: any) =>
                !s.grade ||
                s.grade.toLowerCase().includes('ungraded') ||
                s.grade.toLowerCase().includes('raw')
            );
            const rawAvg = getAverageOf3(rawSales);
            const finalPrice = rawAvg !== null ? rawAvg : (ref.rawPrice ? Number(ref.rawPrice) : null);
            this.marketPriceCache.set(cacheKey, finalPrice);
            return finalPrice;
        }

        if (item.itemType === 'SINGLE_CARD_RAW') {
            const rawSales = sales.filter((s: any) =>
                !s.grade ||
                s.grade.toLowerCase().includes('ungraded') ||
                s.grade.toLowerCase().includes('raw')
            );
            const rawAvg = getAverageOf3(rawSales);
            const price = rawAvg !== null ? rawAvg : (ref.rawPrice ? Number(ref.rawPrice) : null);
            this.marketPriceCache.set(cacheKey, price);
            return price;
        }

        this.marketPriceCache.set(cacheKey, null);
        return null;
    }

    private filterSalesByItemType(sales: any[], item: any) {
        if (item.itemType === 'SINGLE_CARD_GRADED') {
            const grade = String(item.gradeValue).toLowerCase();
            return sales.filter((s: any) => s.grade?.toLowerCase().includes(grade));
        }
        if (item.itemType === 'SINGLE_CARD_RAW') {
            return sales.filter((s: any) =>
                !s.grade ||
                s.grade.toLowerCase().includes('ungraded') ||
                s.grade.toLowerCase().includes('raw')
            );
        }
        return sales;
    }
}
