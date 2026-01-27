import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorService {
    constructor(private readonly prisma: PrismaService) { }

    async getVendorPage(handle: string) {
        // Get seller profile by handle
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { handle },
        });

        if (!seller) {
            throw new NotFoundException(`Vendor with handle "${handle}" not found`);
        }

        // Get items that are LISTED (for sale)
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

        // Transform items for frontend consumption
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
            } else if (item.itemType === 'SINGLE_CARD_GRADED') {
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
}
