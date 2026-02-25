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
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 15, // Reduced for performance
                        },
                    },
                },
                frontMedia: true,
                backMedia: true,
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
                        sales: {
                            orderBy: { date: 'desc' },
                            take: 50,
                        },
                    },
                },
                frontMedia: true,
                backMedia: true,
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
                    edition: dto.edition,
                    integrity: dto.integrity,
                    configuration: dto.configuration as any,
                    gradeProvider: dto.gradeProvider,
                    gradeValue: dto.gradeValue,
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
                } as any,
            });

            return this.transformItem(item);
        } catch (error) {
            this.logger.error(`Failed to create inventory item: ${error.message}`, error.stack);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Database error: ${error.message}`);
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
                edition: dto.edition,
                integrity: dto.integrity,
                configuration: dto.configuration as any,
                gradeProvider: dto.gradeProvider,
                gradeValue: dto.gradeValue,
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
                            take: 15,
                        },
                    },
                },
                frontMedia: true,
                backMedia: true,
            } as any,
        });

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

    async reorderItems(userId: string, items: { id: string; sortOrder: number; stage: InventoryStage }[]) {
        // Use a transaction for bulk updates
        return await this.prisma.$transaction(
            items.map((item) =>
                this.prisma.inventoryItem.updateMany({
                    where: { id: item.id, userId },
                    data: {
                        sortOrder: item.sortOrder,
                        stage: item.stage,
                    },
                }),
            ),
        );
    }

    private validateItemType(dto: CreateInventoryItemDto) {
        if (dto.itemType === ItemType.SINGLE_CARD_RAW) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId) {
                throw new BadRequestException(
                    'cardVariantId or refPriceChartingProductId is required for SINGLE_CARD_RAW',
                );
            }
        } else if (dto.itemType === ItemType.SINGLE_CARD_GRADED) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId) {
                throw new BadRequestException(
                    'cardVariantId or refPriceChartingProductId is required for SINGLE_CARD_GRADED',
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
                            take: 10, // Minimal sales for history fallback
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
                            const dayAvg = filteredSales.reduce((sum, s) => sum + Number(s.price), 0) / filteredSales.length;
                            lastKnownPrices[cacheKey] = dayAvg;
                            itemPrice = dayAvg;
                        }
                    }
                }

                // If no price for this specific day, use last known historical price
                if (itemPrice === 0) {
                    itemPrice = lastKnownPrices[cacheKey] || 0;
                }

                // If still no price from history, fallback to current snapshot or acquisition price
                if (itemPrice === 0) {
                    itemPrice = Number(this.getMarketPrice(item)) || Number(item.marketPriceSnapshot) || Number(item.acquisitionPrice) || 0;
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
            };
        } else if (item.refPriceChartingProduct) {
            cardProfile = {
                id: item.refPriceChartingProduct.id,
                name: item.refPriceChartingProduct.title || 'Unknown',
                set: item.refPriceChartingProduct.set?.name || 'Unknown',
                rarity: '',
                cardNumber: item.refPriceChartingProduct.cardNumber || '',
                imageUrl: this.mediaService.ensureCdnUrl(item.refPriceChartingProduct.imageUrl) || '',
                rawPrice: item.refPriceChartingProduct.rawPrice ? Number(item.refPriceChartingProduct.rawPrice) : null,
                sealedPrice: item.refPriceChartingProduct.sealedPrice ? Number(item.refPriceChartingProduct.sealedPrice) : null,
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
            marketPrice: this.getMarketPrice(item),
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
