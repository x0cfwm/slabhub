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

        console.log(`[VendorService] Found seller: ${seller.shopName} (ID: ${seller.id}, UserID: ${seller.userId})`);

        // Get items that are LISTED (for sale)
        const where: any = {
            stage: 'LISTED',
        };

        if (seller.userId) {
            where.OR = [
                { sellerId: seller.id },
                { userId: seller.userId }
            ];
        } else {
            where.sellerId = seller.id;
        }

        const forSaleItems = await (this.prisma.inventoryItem.findMany as any)({
            where,
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
                refPriceChartingProduct: {
                    include: {
                        set: true,
                    },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });

        console.log(`[VendorService] Found ${forSaleItems.length} items for sale`);

        // Transform items for frontend consumption
        const items = (forSaleItems as any[]).map((item) => {
            // Build card info from variant OR PriceCharting product
            let cardProfile = null;
            let pricing = null;

            if (item.cardVariant?.card) {
                const card = item.cardVariant.card;
                cardProfile = {
                    id: card.id,
                    name: card.name,
                    set: card.set,
                    rarity: card.rarity,
                    cardNumber: card.cardNumber,
                    imageUrl: card.imageUrl,
                };
                if (card.pricingSnapshot) {
                    pricing = {
                        rawPrice: Number(card.pricingSnapshot.rawPrice),
                        sealedPrice: card.pricingSnapshot.sealedPrice
                            ? Number(card.pricingSnapshot.sealedPrice)
                            : null,
                        source: card.pricingSnapshot.source,
                        updatedAt: card.pricingSnapshot.updatedAt.toISOString(),
                    };
                }
            } else if (item.refPriceChartingProduct) {
                const ref = item.refPriceChartingProduct;
                cardProfile = {
                    id: ref.id,
                    name: ref.title || 'Unknown',
                    set: ref.set?.name || 'Unknown',
                    rarity: '',
                    cardNumber: ref.cardNumber || '',
                    imageUrl: ref.imageUrl || '',
                };
                pricing = {
                    rawPrice: ref.rawPrice ? Number(ref.rawPrice) : 0,
                    sealedPrice: ref.sealedPrice ? Number(ref.sealedPrice) : 0,
                    source: ref.priceSource || 'PriceCharting',
                    updatedAt: ref.priceUpdatedAt?.toISOString() || item.updatedAt.toISOString(),
                };
            }

            const base = {
                id: item.id,
                stage: item.stage,
                quantity: item.quantity,
                listingPrice: item.listingPrice ? Number(item.listingPrice) : null,
                sellingDescription: item.sellingDescription,
                acquisitionPrice: item.acquisitionPrice
                    ? Number(item.acquisitionPrice)
                    : null,
                createdAt: item.createdAt.toISOString(),
                cardVariantId: item.cardVariantId,
                refPriceChartingProductId: item.refPriceChartingProductId,
                cardProfile,
                pricing,
            };

            if (item.itemType === 'SINGLE_CARD_RAW') {
                return {
                    ...base,
                    type: 'SINGLE_CARD_RAW',
                    condition: item.condition,
                };
            } else if (item.itemType === 'SINGLE_CARD_GRADED') {
                return {
                    ...base,
                    type: 'SINGLE_CARD_GRADED',
                    gradingCompany: item.gradeProvider,
                    grade: item.gradeValue,
                    certNumber: item.certNumber,
                    slabImages: item.slabImages || {},
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
