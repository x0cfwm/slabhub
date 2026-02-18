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

    private getMarketPrice(item: any) {
        if (!item.refPriceChartingProduct) return null;

        const ref = item.refPriceChartingProduct;

        if (item.itemType === 'SEALED_PRODUCT') {
            return ref.sealedPrice ? Number(ref.sealedPrice) : null;
        }

        if (item.itemType === 'SINGLE_CARD_RAW') {
            return ref.rawPrice ? Number(ref.rawPrice) : null;
        }

        if (item.itemType === 'SINGLE_CARD_GRADED') {
            const grade = String(item.gradeValue);
            if (grade === '10') return ref.grade10Price ? Number(ref.grade10Price) : (ref.rawPrice ? Number(ref.rawPrice) : null);
            if (grade === '9.5') return ref.grade95Price ? Number(ref.grade95Price) : (ref.rawPrice ? Number(ref.rawPrice) : null);
            if (grade === '9') return ref.grade9Price ? Number(ref.grade9Price) : (ref.rawPrice ? Number(ref.rawPrice) : null);
            if (grade === '8') return ref.grade8Price ? Number(ref.grade8Price) : (ref.rawPrice ? Number(ref.rawPrice) : null);
            if (grade === '7') return ref.grade7Price ? Number(ref.grade7Price) : (ref.rawPrice ? Number(ref.rawPrice) : null);

            return ref.rawPrice ? Number(ref.rawPrice) : null;
        }

        return null;
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
