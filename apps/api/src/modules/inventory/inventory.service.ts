import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ItemType, InventoryStage } from '@prisma/client';

import { MediaService } from '../media/media.service';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mediaService: MediaService,
    ) { }

    async listItems(userId: string) {
        this.marketPriceCache.clear();
        const items = await this.prisma.inventoryItem.findMany({
            where: { userId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            include: {
                cardVariant: {
                    include: {
                        card: true,
                    },
                },
                refPriceChartingProduct: {
                    include: {
                        set: true,
                        // No sales needed here anymore, we use snapshots
                    },
                },
                frontMedia: true,
                backMedia: true,
                status: true,
            } as any,
        });

        return items.map((item) => this.transformItem(item));
    }

    async getItem(userId: string, itemId: string) {
        const item = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
            include: {
                cardVariant: {
                    include: {
                        card: true,
                    },
                },
                refPriceChartingProduct: {
                    include: {
                        set: true,
                        //getItem might still want to show sales in a modal, but for valuation we use snapshots
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 50,
                        },
                    },
                },
                frontMedia: true,
                backMedia: true,
                status: true,
            } as any,
        });

        if (!item) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        return this.transformItem(item);
    }

    async createItem(userId: string, sellerId: string | undefined, dto: CreateInventoryItemDto) {
        try {
            this.validateItemType(dto);

            const item = await this.prisma.inventoryItem.create({
                data: {
                    user: { connect: { id: userId } },
                    seller: sellerId ? { connect: { id: sellerId } } : undefined,
                    itemType: dto.itemType,
                    cardVariant: dto.cardVariantId
                        ? { connect: { id: dto.cardVariantId } }
                        : undefined,
                    refPriceChartingProduct: dto.refPriceChartingProductId
                        ? { connect: { id: dto.refPriceChartingProductId } }
                        : undefined,
                    productName: dto.productName,
                    productType: dto.productType,
                    language: dto.language,
                    setName: dto.setName,
                    setCode: dto.setCode,
                    cardNumber: dto.cardNumber,
                    edition: dto.edition,
                    integrity: dto.integrity,
                    configuration: dto.configuration as any,
                    gradeProvider: dto.gradeProvider,
                    gradeValue: dto.gradeValue?.toString(),
                    certNumber: dto.certNumber,
                    certificationNumber: dto.certificationNumber || dto.certNumber,
                    gradingMeta: dto.gradingMeta,
                    gradingCost: dto.gradingCost,
                    slabImages: dto.slabImages as any,
                    condition: dto.condition,
                    quantity: dto.quantity || 1,
                    sortOrder: dto.sortOrder || 0,
                    stage: dto.stage || 'ACQUIRED',
                    listingPrice: dto.listingPrice,
                    acquisitionPrice: dto.acquisitionPrice,
                    acquisitionDate: dto.acquisitionDate
                        ? new Date(dto.acquisitionDate)
                        : null,
                    acquisitionSource: dto.acquisitionSource,
                    storageLocation: dto.storageLocation,
                    notes: dto.notes,
                    sellingDescription: dto.sellingDescription,
                    photos: (dto.photos || []).filter(Boolean),
                    frontMedia: dto.frontMediaId
                        ? { connect: { id: dto.frontMediaId } }
                        : undefined,
                    backMedia: dto.backMediaId
                        ? { connect: { id: dto.backMediaId } }
                        : undefined,
                    status: dto.statusId
                        ? { connect: { id: dto.statusId } }
                        : undefined,
                } as any,
                include: {
                    cardVariant: {
                        include: {
                            card: true,
                        },
                    },
                    refPriceChartingProduct: {
                        include: {
                            set: true,
                            sales: {
                                orderBy: { date: 'desc' },
                                take: 50,
                            },
                        },
                    },
                    frontMedia: true,
                    backMedia: true,
                    status: true,
                } as any,
            });

            // Initial snapshot calculation if we have product data
            if (item.refPriceChartingProductId) {
                const currentPrice = this.getMarketPrice(item);
                if (currentPrice !== null) {
                    await this.prisma.inventoryItem.update({
                        where: { id: item.id },
                        data: { marketPriceSnapshot: currentPrice }
                    });
                    (item as any).marketPriceSnapshot = currentPrice;
                }
            }

            return this.transformItem(item);
        } catch (error) {
            this.logger.error(`Failed to create inventory item: ${error.message}`, error.stack);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Database error: ${error.message}`, { cause: error });
        }
    }


    async updateItem(
        userId: string,
        itemId: string,
        dto: UpdateInventoryItemDto,
    ) {
        // Verify ownership
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        const item = await this.prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
                ...(dto.cardVariantId !== undefined && {
                    cardVariant: dto.cardVariantId
                        ? { connect: { id: dto.cardVariantId } }
                        : { disconnect: true }
                }),
                ...(dto.refPriceChartingProductId !== undefined && {
                    refPriceChartingProduct: dto.refPriceChartingProductId
                        ? { connect: { id: dto.refPriceChartingProductId } }
                        : { disconnect: true }
                }),
                itemType: dto.itemType,
                productName: dto.productName,
                language: dto.language,
                setName: dto.setName,
                setCode: dto.setCode,
                cardNumber: dto.cardNumber,
                edition: dto.edition,
                integrity: dto.integrity,
                configuration: dto.configuration as any,
                gradeProvider: dto.gradeProvider,
                gradeValue: dto.gradeValue?.toString(),
                certNumber: dto.certNumber,
                gradingCost: dto.gradingCost,
                slabImages: dto.slabImages as any,
                condition: dto.condition,
                quantity: dto.quantity,
                sortOrder: dto.sortOrder,
                stage: dto.stage,
                listingPrice: dto.listingPrice,
                acquisitionPrice: dto.acquisitionPrice,
                acquisitionDate: dto.acquisitionDate
                    ? new Date(dto.acquisitionDate)
                    : undefined,
                acquisitionSource: dto.acquisitionSource,
                storageLocation: dto.storageLocation,
                notes: dto.notes,
                sellingDescription: dto.sellingDescription,
                photos: dto.photos,
                frontMedia: dto.frontMediaId !== undefined
                    ? (dto.frontMediaId ? { connect: { id: dto.frontMediaId } } : { disconnect: true })
                    : undefined,
                backMedia: dto.backMediaId !== undefined
                    ? (dto.backMediaId ? { connect: { id: dto.backMediaId } } : { disconnect: true })
                    : undefined,
                status: dto.statusId !== undefined
                    ? (dto.statusId ? { connect: { id: dto.statusId } } : { disconnect: true })
                    : undefined,
            } as any,
            include: {
                cardVariant: {
                    include: {
                        card: true,
                    },
                },
                refPriceChartingProduct: {
                    include: {
                        set: true,
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 50,
                        },
                    },
                },
                frontMedia: true,
                backMedia: true,
                status: true,
            } as any,
        });

        // Update snapshot if we have product data (re-calculate on every update for consistency)
        if (item.refPriceChartingProductId) {
            const currentPrice = this.getMarketPrice(item);
            if (currentPrice !== null) {
                await this.prisma.inventoryItem.update({
                    where: { id: item.id },
                    data: { marketPriceSnapshot: currentPrice }
                });
                (item as any).marketPriceSnapshot = currentPrice;
            }
        }

        // Check for transitions
        const hasStageChanged = (dto as any).stage !== undefined && (dto as any).stage !== existing.stage;
        const hasStatusChanged = (dto as any).statusId !== undefined && (dto as any).statusId !== (existing as any).statusId;

        if (hasStageChanged || hasStatusChanged) {
            await this.recordHistory(userId, itemId, {
                fromStage: existing.stage,
                toStage: (dto as any).stage || existing.stage,
                fromStatusId: (existing as any).statusId || undefined,
                toStatusId: (dto as any).statusId || undefined,
            });
        }

        return this.transformItem(item);
    }

    async deleteItem(userId: string, itemId: string) {
        // Verify ownership
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        await this.prisma.inventoryItem.delete({
            where: { id: itemId },
        });

        return { success: true };
    }

    async reorderItems(userId: string, items: { id: string; sortOrder: number; stage: InventoryStage; statusId?: string }[]) {
        // To track transitions, we need current states
        const itemIds = items.map(i => i.id);
        const existingItems = await this.prisma.inventoryItem.findMany({
            where: { id: { in: itemIds }, userId },
            select: { id: true, stage: true, statusId: true },
        });

        const existingMap = new Map(existingItems.map(i => [i.id, i]));

        // Use a transaction for bulk updates
        const result = await this.prisma.$transaction(
            items.map((item) =>
                this.prisma.inventoryItem.updateMany({
                    where: { id: item.id, userId },
                    data: {
                        sortOrder: item.sortOrder,
                        stage: item.stage,
                        statusId: item.statusId,
                    },
                }),
            ),
        );

        // Record history for items that moved columns
        for (const item of items) {
            const existing = existingMap.get(item.id);
            if (!existing) continue;

            const hasStageChanged = item.stage !== existing.stage;
            const hasStatusChanged = item.statusId !== (existing as any).statusId;

            if (hasStageChanged || hasStatusChanged) {
                await this.recordHistory(userId, item.id, {
                    fromStage: existing.stage,
                    toStage: item.stage,
                    fromStatusId: (existing as any).statusId || undefined,
                    toStatusId: item.statusId || undefined,
                }).catch(err => this.logger.error(`Failed to record reorder history: ${err.message}`));
            }
        }

        return result;
    }

    async getItemHistory(userId: string, itemId: string) {
        // Verify ownership indirectly by checking if item exists for user
        const item = await this.prisma.inventoryItem.findFirst({
            where: { id: itemId, userId },
        });

        if (!item) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        return this.prisma.inventoryHistory.findMany({
            where: { itemId, userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async recordHistory(
        userId: string,
        itemId: string,
        data: {
            fromStage?: InventoryStage;
            toStage?: InventoryStage;
            fromStatusId?: string;
            toStatusId?: string;
        },
    ) {
        try {
            return await this.prisma.inventoryHistory.create({
                data: {
                    itemId,
                    userId,
                    type: 'TRANSITION',
                    fromStage: data.fromStage || null,
                    toStage: data.toStage || null,
                    fromStatusId: data.fromStatusId || null,
                    toStatusId: data.toStatusId || null,
                },
            });
        } catch (error: any) {
            this.logger.error(`Failed to record history for item ${itemId}: ${error.message}`, error.stack);
            // We don't necessarily want to fail the whole update if history fails, 
            // but for now let's rethrow to see if it's the cause of missing records.
            throw error;
        }
    }

    private validateItemType(dto: CreateInventoryItemDto) {
        if (dto.itemType === ItemType.SINGLE_CARD_RAW) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId && !dto.productName) {
                throw new BadRequestException(
                    'cardVariantId, refPriceChartingProductId, or productName is required for SINGLE_CARD_RAW',
                );
            }
        } else if (dto.itemType === ItemType.SINGLE_CARD_GRADED) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId && !dto.productName) {
                throw new BadRequestException(
                    'cardVariantId, refPriceChartingProductId, or productName is required for SINGLE_CARD_GRADED',
                );
            }
            if (!dto.gradeProvider || !dto.gradeValue) {
                throw new BadRequestException(
                    'gradeProvider and gradeValue are required for SINGLE_CARD_GRADED',
                );
            }
        } else if (dto.itemType === ItemType.SEALED_PRODUCT) {
            if (!dto.productName || !dto.productType) {
                throw new BadRequestException(
                    'productName and productType are required for SEALED_PRODUCT',
                );
            }
        }
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
                            take: 50, // Increased to match global getMarketPrice accuracy
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

        // Group sales by product and date
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

        // Pre-calculate acquisition data
        const itemsWithAcqDate = items.map(item => ({
            ...item,
            acqDate: item.acquisitionDate ? new Date(item.acquisitionDate) : new Date(item.createdAt)
        }));

        // Track last known price per item part (Product + Type + Grade)
        const lastKnownPrices: Record<string, number> = {};

        // To make it smoother, we'll iterate through days
        for (let i = days; i >= 0; i--) {
            const currentDate = new Date(now);
            currentDate.setDate(now.getDate() - i);
            currentDate.setHours(23, 59, 59, 999);
            const dateStr = currentDate.toISOString().split('T')[0];

            let totalMarketValue = 0;
            let totalCost = 0;

            itemsWithAcqDate.forEach(item => {
                if (item.acqDate > currentDate) return; // Not acquired yet

                const qty = item.quantity || 1;
                totalCost += (Number(item.acquisitionPrice) || 0) * qty;

                let itemPrice = 0;
                const cacheKey = `${item.refPriceChartingProductId}_${item.itemType}_${item.gradeValue}`;

                if (item.refPriceChartingProductId) {
                    const daySales = salesByProductAndDate[item.refPriceChartingProductId]?.[dateStr] || [];

                    if (daySales.length > 0) {
                        const filteredSales = this.filterSalesByItemType(daySales, item);
                        if (filteredSales.length > 0) {
                            // Use mean price for the day
                            const dayAvg = filteredSales.reduce((sum: number, s: any) => sum + Number(s.price), 0) / filteredSales.length;
                            lastKnownPrices[cacheKey] = dayAvg;
                            itemPrice = dayAvg;
                        }
                    }
                }

                // ALIGNMENT FIX:
                // 1. For the current day (i=0), we MUST use the same dynamic logic as the dashboard to avoid jumps.
                // 2. We improve the fallback chain to be Dynamic -> Snapshot -> Acquisition.
                const dynamicPrice = this.getMarketPrice(item);
                const snapshotPrice = Number(item.marketPriceSnapshot);
                const acqPrice = Number(item.acquisitionPrice);

                if (i === 0) {
                    itemPrice = dynamicPrice || snapshotPrice || acqPrice || 0;
                } else if (itemPrice === 0) {
                    // For historical points, if we don't have a daily sale, try:
                    // lastKnownPrice (from history loop) -> dynamicPrice (smoothed) -> snapshot -> acq
                    itemPrice = lastKnownPrices[cacheKey] || dynamicPrice || snapshotPrice || acqPrice || 0;
                }

                totalMarketValue += itemPrice * qty;
            });

            history.push({
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                value: Math.round(totalMarketValue),
                cost: Math.round(totalCost)
            });
        }

        return history;
    }

    async syncAllMarketPriceSnapshots() {
        // Get all unique products linked to inventory items
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
        const allUpdates: { id: string; oldPrice: number | null; newPrice: number | null; lastSaleDate: string | null }[] = [];

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
        // Find all inventory items linked to this PriceCharting product
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

        const updates: { id: string; oldPrice: number | null; newPrice: number | null; lastSaleDate: string | null }[] = [];
        this.marketPriceCache.clear();

        for (const item of items) {
            const currentPrice = this.getMarketPrice(item);
            const oldPrice = item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null;

            // Get the latest sale date for the specific item type/grade
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

    private filterSalesByItemType(sales: any[], item: any) {
        if (item.itemType === 'SINGLE_CARD_GRADED') {
            const grade = String(item.gradeValue).toLowerCase();
            return sales.filter((s: any) => s.grade?.toLowerCase().includes(grade));
        }
        if (item.itemType === 'SINGLE_CARD_RAW') {
            // PriceCharting usually has "Ungraded" or null for raw
            return sales.filter((s: any) =>
                !s.grade ||
                s.grade.toLowerCase().includes('ungraded') ||
                s.grade.toLowerCase().includes('raw')
            );
        }
        return sales;
    }

    private marketPriceCache = new Map<string, number | null>();

    public getMarketPrice(item: any) {
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

        // Helper to calculate average of last 3 sales
        const getAverageOf3 = (filteredSales: any[]) => {
            if (filteredSales.length === 0) return null;
            const last3 = filteredSales.slice(0, 3);
            const sum = last3.reduce((acc, s) => acc + Number(s.price), 0);
            return sum / last3.length;
        };

        if (item.itemType === 'SINGLE_CARD_GRADED') {
            const gradeStr = String(item.gradeValue || '').toLowerCase();

            // 1. Try to find sales for this specific grade
            const gradedSales = sales.filter((s: any) => s.grade?.toLowerCase().includes(gradeStr));
            const gradedAvg = getAverageOf3(gradedSales);
            if (gradedAvg !== null) {
                this.marketPriceCache.set(cacheKey, gradedAvg);
                return gradedAvg;
            }

            // 2. Fallback to summary grade price if available (from PriceCharting elements)
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

            // 3. Fallback to Raw sales average
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
            // 1. Try to find last 3 raw sales
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

    public transformItem(item: any) {
        // Build card info from variant if available
        let cardProfile = null;
        if (item.cardVariant?.card) {
            cardProfile = {
                id: item.cardVariant.card.id,
                name: item.cardVariant.card.name,
                set: item.cardVariant.card.set,
                rarity: item.cardVariant.card.rarity,
                cardNumber: item.cardVariant.card.cardNumber,
                imageUrl: item.cardVariant.card.imageUrl,
                setCode: item.cardVariant.card.set, // Fallback
            };
        } else if (item.refPriceChartingProduct) {
            cardProfile = {
                id: item.refPriceChartingProduct.id,
                name: item.refPriceChartingProduct.title || 'Unknown',
                set: item.refPriceChartingProduct.set?.name || 'Unknown',
                setCode: item.refPriceChartingProduct.set?.code || item.setCode,
                rarity: '',
                cardNumber: item.refPriceChartingProduct.cardNumber || item.cardNumber || '',
                imageUrl: this.mediaService.ensureCdnUrl(item.refPriceChartingProduct.imageUrl) || '',
                rawPrice: item.refPriceChartingProduct.rawPrice ? Number(item.refPriceChartingProduct.rawPrice) : null,
                sealedPrice: item.refPriceChartingProduct.sealedPrice ? Number(item.refPriceChartingProduct.sealedPrice) : null,
            };
        } else if (item.productName) {
            cardProfile = {
                id: null,
                name: item.productName,
                set: item.setName || 'Unknown',
                setCode: item.setCode || '',
                rarity: '',
                cardNumber: item.cardNumber || '',
                imageUrl: (item.photos && (item.photos as string[]).length > 0) ? (item.photos as string[])[0] : '',
            };
        }

        // Format based on frontend expected structure
        const base = {
            id: item.id,
            stage: item.stage,
            acquisitionPrice: item.acquisitionPrice
                ? Number(item.acquisitionPrice)
                : null,
            listingPrice: item.listingPrice ? Number(item.listingPrice) : null,
            marketPriceSnapshot: item.marketPriceSnapshot
                ? Number(item.marketPriceSnapshot)
                : null,
            marketPrice: item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null,
            acquisitionDate: item.acquisitionDate?.toISOString?.() || null,
            acquisitionSource: item.acquisitionSource,
            storageLocation: item.storageLocation,
            notes: item.notes,
            sellingDescription: item.sellingDescription,
            photos: item.photos || [],
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            quantity: item.quantity,
            sortOrder: item.sortOrder,
            statusId: item.statusId,
            status: item.status,
            frontMediaId: item.frontMediaId,
            backMediaId: item.backMediaId,
            frontMediaUrl: item.frontMedia
                ? this.mediaService.getPublicUrl(item.frontMedia, { preferCdn: true })
                : null,
            backMediaUrl: item.backMedia
                ? this.mediaService.getPublicUrl(item.backMedia, { preferCdn: true })
                : null,
        };

        if (item.itemType === 'SINGLE_CARD_RAW') {
            return {
                ...base,
                type: 'SINGLE_CARD_RAW',
                cardVariantId: item.cardVariantId,
                refPriceChartingProductId: item.refPriceChartingProductId,
                condition: item.condition,
                // Denormalized card info for frontend convenience
                cardProfile,
            };
        } else if (item.itemType === 'SINGLE_CARD_GRADED') {
            return {
                ...base,
                type: 'SINGLE_CARD_GRADED',
                cardVariantId: item.cardVariantId,
                refPriceChartingProductId: item.refPriceChartingProductId,
                gradingCompany: item.gradeProvider,
                grade: item.gradeValue,
                gradeProvider: item.gradeProvider,
                gradeValue: item.gradeValue,
                certNumber: item.certNumber,
                gradingCost: item.gradingCost ? Number(item.gradingCost) : null,
                slabImages: item.slabImages || {},
                gradingMeta: item.gradingMeta || {},
                previousCertNumbers: item.previousCertNumbers || [],
                cardProfile,
            };
        } else if (item.itemType === 'SEALED_PRODUCT') {
            return {
                ...base,
                type: 'SEALED_PRODUCT',
                productName: item.productName,
                productType: item.productType,
                language: item.language,
                setName: item.setName,
                edition: item.edition,
                integrity: item.integrity,
                configuration: item.configuration || {},
            };
        }

        return base;
    }
}
