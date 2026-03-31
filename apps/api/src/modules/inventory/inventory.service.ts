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
import { InventoryPresenter } from './inventory.presenter';
import { InventoryValuationService } from './inventory-valuation.service';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly presenter: InventoryPresenter,
        private readonly valuationService: InventoryValuationService,
    ) { }

    async listItems(userId: string) {
        this.valuationService.clearCache();
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

        return items.map((item) => this.presenter.transformItem(item));
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

        return this.presenter.transformItem(item);
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
                    soldPrice: dto.soldPrice,
                    soldDate: dto.soldDate ? new Date(dto.soldDate) : null,
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
                const currentPrice = this.valuationService.getMarketPrice(item);
                if (currentPrice !== null) {
                    await this.prisma.inventoryItem.update({
                        where: { id: item.id },
                        data: { marketPriceSnapshot: currentPrice }
                    });
                    (item as any).marketPriceSnapshot = currentPrice;
                }
            }

            return this.presenter.transformItem(item);
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
                soldPrice: dto.soldPrice,
                soldDate: dto.soldDate !== undefined ? (dto.soldDate ? new Date(dto.soldDate) : null) : undefined,
                acquisitionPrice: dto.acquisitionPrice,
                acquisitionDate: dto.acquisitionDate !== undefined
                    ? (dto.acquisitionDate ? new Date(dto.acquisitionDate) : null)
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
            const currentPrice = this.valuationService.getMarketPrice(item);
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

        return this.presenter.transformItem(item);
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
        return this.valuationService.getMarketValueHistory(userId, days);
    }

    async syncAllMarketPriceSnapshots() {
        return this.valuationService.syncAllMarketPriceSnapshots();
    }

    async recalculateMarketPriceSnapshots(productId: string) {
        return this.valuationService.recalculateMarketPriceSnapshots(productId);
    }

    public getMarketPrice(item: any) {
        return this.valuationService.getMarketPrice(item);
    }

    public transformItem(item: any) {
        return this.presenter.transformItem(item);
    }
}
