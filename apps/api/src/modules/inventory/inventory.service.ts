import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ItemType } from '@prisma/client';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(private readonly prisma: PrismaService) { }

    async listItems(sellerId: string) {
        const items = await this.prisma.inventoryItem.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' },
            include: {
                cardVariant: {
                    include: {
                        card: true,
                    },
                },
                refPriceChartingProduct: {
                    include: {
                        set: true,
                    },
                },
            },
        });

        return items.map((item) => this.transformItem(item));
    }

    async getItem(sellerId: string, itemId: string) {
        const item = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                sellerId,
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
                    },
                },
            },
        });

        if (!item) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        return this.transformItem(item);
    }

    async createItem(sellerId: string, dto: CreateInventoryItemDto) {
        try {
            this.validateItemType(dto);

            const item = await this.prisma.inventoryItem.create({
                data: {
                    sellerId,
                    itemType: dto.itemType,
                    cardVariantId: dto.cardVariantId,
                    refPriceChartingProductId: dto.refPriceChartingProductId,
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
                    stage: dto.stage || 'ACQUIRED',
                    listingPrice: dto.listingPrice,
                    acquisitionPrice: dto.acquisitionPrice,
                    acquisitionDate: dto.acquisitionDate
                        ? new Date(dto.acquisitionDate)
                        : null,
                    acquisitionSource: dto.acquisitionSource,
                    storageLocation: dto.storageLocation,
                    notes: dto.notes,
                    photos: dto.photos || [],
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
                        },
                    },
                },
            });

            return this.transformItem(item);
        } catch (error) {
            this.logger.error(`Failed to create inventory item: ${error.message}`, error.stack);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Database error: ${error.message}`);
        }
    }


    async updateItem(
        sellerId: string,
        itemId: string,
        dto: UpdateInventoryItemDto,
    ) {
        // Verify ownership
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                sellerId,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
        }

        const item = await this.prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
                cardVariantId: dto.cardVariantId,
                refPriceChartingProductId: dto.refPriceChartingProductId,
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
                stage: dto.stage,
                listingPrice: dto.listingPrice,
                acquisitionPrice: dto.acquisitionPrice,
                acquisitionDate: dto.acquisitionDate
                    ? new Date(dto.acquisitionDate)
                    : undefined,
                acquisitionSource: dto.acquisitionSource,
                storageLocation: dto.storageLocation,
                notes: dto.notes,
                photos: dto.photos,
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
                    },
                },
            },
        });

        return this.transformItem(item);
    }

    async deleteItem(sellerId: string, itemId: string) {
        // Verify ownership
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                sellerId,
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

    private transformItem(item: any) {
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
                imageUrl: item.refPriceChartingProduct.imageUrl || '',
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
            acquisitionDate: item.acquisitionDate?.toISOString?.() || null,
            acquisitionSource: item.acquisitionSource,
            storageLocation: item.storageLocation,
            notes: item.notes,
            photos: item.photos || [],
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            quantity: item.quantity,
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
