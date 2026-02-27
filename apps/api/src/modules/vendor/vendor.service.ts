import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class VendorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mediaService: MediaService,
        private readonly inventoryService: InventoryService,
    ) { }

    async getVendorPage(handle: string) {
        // Get seller profile by handle
        const seller: any = await this.prisma.sellerProfile.findUnique({
            where: { handle },
            include: {
                user: { include: { oauthIdentities: true } },
                avatarMedia: true,
            },
        });

        if (!seller) {
            throw new NotFoundException(`Vendor with handle "${handle}" not found`);
        }

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
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });

        // Use central transformation logic from InventoryService
        const items = (forSaleItems as any[]).map((item) => {
            return this.inventoryService.transformItem(item);
        });

        const facebookIdentity = seller.user?.oauthIdentities?.find((i: any) => i.provider === 'facebook');

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
                referenceLinks: (seller.referenceLinks as any[]) || [],
                upcomingEvents: (seller.upcomingEvents as any[]) || [],
                avatarUrl: seller.avatarMedia ? this.mediaService.getPublicUrl(seller.avatarMedia, { preferCdn: true }) : null,
                facebookVerifiedAt: seller.user?.facebookVerifiedAt?.toISOString() || null,
                facebookProfileUrl: facebookIdentity?.profileUrl || null,
            },
            items,
            itemCount: items.length,
        };
    }
}
