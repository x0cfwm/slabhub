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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorService = class VendorService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getVendorPage(handle) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { handle },
        });
        if (!seller) {
            throw new common_1.NotFoundException(`Vendor with handle "${handle}" not found`);
        }
        const forSaleItems = await this.prisma.inventoryItem.findMany({
            where: {
                sellerId: seller.id,
                stage: 'LISTED',
            },
            include: {
                cardVariant: {
                    include: {
                        card: {
                            include: {
                                pricingSnapshot: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const items = forSaleItems.map((item) => {
            const cardProfile = item.cardVariant?.card;
            const pricing = cardProfile?.pricingSnapshot;
            const base = {
                id: item.id,
                stage: item.stage,
                quantity: item.quantity,
                listingPrice: item.listingPrice ? Number(item.listingPrice) : null,
                acquisitionPrice: item.acquisitionPrice
                    ? Number(item.acquisitionPrice)
                    : null,
                createdAt: item.createdAt.toISOString(),
            };
            if (item.itemType === 'SINGLE_CARD_RAW') {
                return {
                    ...base,
                    type: 'SINGLE_CARD_RAW',
                    cardVariantId: item.cardVariantId,
                    condition: item.condition,
                    cardProfile: cardProfile
                        ? {
                            id: cardProfile.id,
                            name: cardProfile.name,
                            set: cardProfile.set,
                            rarity: cardProfile.rarity,
                            cardNumber: cardProfile.cardNumber,
                            imageUrl: cardProfile.imageUrl,
                        }
                        : null,
                    pricing: pricing
                        ? {
                            rawPrice: Number(pricing.rawPrice),
                            sealedPrice: pricing.sealedPrice
                                ? Number(pricing.sealedPrice)
                                : null,
                            source: pricing.source,
                            updatedAt: pricing.updatedAt.toISOString(),
                        }
                        : null,
                };
            }
            else if (item.itemType === 'SINGLE_CARD_GRADED') {
                return {
                    ...base,
                    type: 'SINGLE_CARD_GRADED',
                    cardVariantId: item.cardVariantId,
                    gradingCompany: item.gradeProvider,
                    grade: item.gradeValue,
                    certNumber: item.certNumber,
                    slabImages: item.slabImages || {},
                    cardProfile: cardProfile
                        ? {
                            id: cardProfile.id,
                            name: cardProfile.name,
                            set: cardProfile.set,
                            rarity: cardProfile.rarity,
                            cardNumber: cardProfile.cardNumber,
                            imageUrl: cardProfile.imageUrl,
                        }
                        : null,
                    pricing: pricing
                        ? {
                            rawPrice: Number(pricing.rawPrice),
                            sealedPrice: pricing.sealedPrice
                                ? Number(pricing.sealedPrice)
                                : null,
                            source: pricing.source,
                            updatedAt: pricing.updatedAt.toISOString(),
                        }
                        : null,
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
        });
        return {
            profile: {
                handle: seller.handle,
                shopName: seller.shopName,
                isActive: seller.isActive,
                locationCountry: seller.locationCountry,
                locationCity: seller.locationCity,
                paymentsAccepted: seller.paymentsAccepted,
                meetupsEnabled: seller.meetupsEnabled,
                shippingEnabled: seller.shippingEnabled,
                socials: seller.socials,
                wishlistText: seller.wishlistText,
            },
            items,
            itemCount: items.length,
        };
    }
};
exports.VendorService = VendorService;
exports.VendorService = VendorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorService);
//# sourceMappingURL=vendor.service.js.map