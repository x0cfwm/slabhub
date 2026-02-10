"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = InventoryService_1 = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(InventoryService_1.name);
    }
    async listItems(userId) {
        const items = await this.prisma.inventoryItem.findMany({
            where: { userId },
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
    async getItem(userId, itemId) {
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
            },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Inventory item ${itemId} not found`);
        }
        return this.transformItem(item);
    }
    async createItem(userId, sellerId, dto) {
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
                    configuration: dto.configuration,
                    gradeProvider: dto.gradeProvider,
                    gradeValue: dto.gradeValue,
                    certNumber: dto.certNumber,
                    certificationNumber: dto.certificationNumber || dto.certNumber,
                    gradingMeta: dto.gradingMeta,
                    gradingCost: dto.gradingCost,
                    slabImages: dto.slabImages,
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
                    photos: (dto.photos || []).filter(Boolean),
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
        catch (error) {
            this.logger.error(`Failed to create inventory item: ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException(`Database error: ${error.message}`);
        }
    }
    async updateItem(userId, itemId, dto) {
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Inventory item ${itemId} not found`);
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
                configuration: dto.configuration,
                gradeProvider: dto.gradeProvider,
                gradeValue: dto.gradeValue,
                certNumber: dto.certNumber,
                gradingCost: dto.gradingCost,
                slabImages: dto.slabImages,
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
    async deleteItem(userId, itemId) {
        const existing = await this.prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Inventory item ${itemId} not found`);
        }
        await this.prisma.inventoryItem.delete({
            where: { id: itemId },
        });
        return { success: true };
    }
    validateItemType(dto) {
        if (dto.itemType === client_1.ItemType.SINGLE_CARD_RAW) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId) {
                throw new common_1.BadRequestException('cardVariantId or refPriceChartingProductId is required for SINGLE_CARD_RAW');
            }
        }
        else if (dto.itemType === client_1.ItemType.SINGLE_CARD_GRADED) {
            if (!dto.cardVariantId && !dto.refPriceChartingProductId) {
                throw new common_1.BadRequestException('cardVariantId or refPriceChartingProductId is required for SINGLE_CARD_GRADED');
            }
            if (!dto.gradeProvider || !dto.gradeValue) {
                throw new common_1.BadRequestException('gradeProvider and gradeValue are required for SINGLE_CARD_GRADED');
            }
        }
        else if (dto.itemType === client_1.ItemType.SEALED_PRODUCT) {
            if (!dto.productName || !dto.productType) {
                throw new common_1.BadRequestException('productName and productType are required for SEALED_PRODUCT');
            }
        }
    }
    transformItem(item) {
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
        }
        else if (item.refPriceChartingProduct) {
            cardProfile = {
                id: item.refPriceChartingProduct.id,
                name: item.refPriceChartingProduct.title || 'Unknown',
                set: item.refPriceChartingProduct.set?.name || 'Unknown',
                rarity: '',
                cardNumber: item.refPriceChartingProduct.cardNumber || '',
                imageUrl: item.refPriceChartingProduct.imageUrl || '',
            };
        }
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
                cardProfile,
            };
        }
        else if (item.itemType === 'SINGLE_CARD_GRADED') {
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
        }
        else if (item.itemType === 'SEALED_PRODUCT') {
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map