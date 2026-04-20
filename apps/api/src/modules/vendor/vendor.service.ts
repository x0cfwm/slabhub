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

    async listVendors(params: { search?: string; page: number; limit: number }) {
        const { search, page, limit } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            isActive: true,
            shopName: { not: '' },
            handle: { not: '' },
            AND: [
                {
                    OR: [
                        { inventoryItems: { some: { stage: 'LISTED' } } },
                        { user: { inventoryItems: { some: { stage: 'LISTED' } } } }
                    ]
                }
            ]
        };

        if (search) {
            where.AND.push({
                OR: [
                    { shopName: { contains: search, mode: 'insensitive' } },
                    { handle: { contains: search, mode: 'insensitive' } },
                    { location: { contains: search, mode: 'insensitive' } },
                ]
            });
        }

        const [sellers, total] = await Promise.all([
            this.prisma.sellerProfile.findMany({
                where,
                include: {
                    avatarMedia: true,
                    user: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.sellerProfile.count({ where }),
        ]);

        // Get item counts and preview images for each vendor
        const vendors = await Promise.all(
            (sellers as any[]).map(async (seller) => {
                const itemWhere: any = { stage: 'LISTED' };
                if (seller.userId) {
                    itemWhere.OR = [
                        { sellerId: seller.id },
                        { userId: seller.userId },
                    ];
                } else {
                    itemWhere.sellerId = seller.id;
                }

                const [itemCount, previewItems] = await Promise.all([
                    this.prisma.inventoryItem.count({ where: itemWhere }),
                    (this.prisma.inventoryItem.findMany as any)({
                        where: itemWhere,
                        include: {
                            cardVariant: { include: { card: true } },
                            frontMedia: true,
                        },
                        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
                        take: 4,
                    }),
                ]);

                const previewImages = (previewItems as any[])
                    .map((item: any) => {
                        if (item.photos?.length > 0) return item.photos[0];
                        if (item.frontMedia) return this.mediaService.getPublicUrl(item.frontMedia, { preferCdn: true });
                        if (item.cardVariant?.card?.imageUrl) return item.cardVariant.card.imageUrl;
                        return null;
                    })
                    .filter(Boolean);

                return {
                    handle: seller.handle,
                    shopName: seller.shopName,
                    location: seller.location || '',
                    avatarUrl: seller.avatarMedia
                        ? this.mediaService.getPublicUrl(seller.avatarMedia, { preferCdn: true })
                        : null,
                    fulfillmentOptions: seller.fulfillmentOptions?.length > 0
                        ? seller.fulfillmentOptions
                        : [
                            seller.shippingEnabled ? 'shipping' : null,
                            seller.meetupsEnabled ? 'meetups_local' : null,
                        ].filter(Boolean),
                    paymentsAccepted: seller.paymentsAccepted || [],
                    itemCount,
                    previewImages,
                    facebookVerifiedAt: seller.user?.facebookVerifiedAt?.toISOString() || null,
                };
            }),
        );

        return { vendors, total, page };
    }

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
                status: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });

        // Get listed workflow statuses for tabs
        const listedStatuses = seller.userId ? await this.prisma.workflowStatus.findMany({
            where: {
                userId: seller.userId,
                systemId: 'LISTED',
                showOnKanban: true, // typically only show active kanban columns
            },
            orderBy: { position: 'asc' }
        }) : [];

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
                location: seller.location,
                paymentsAccepted: seller.paymentsAccepted,
                meetupsEnabled: seller.meetupsEnabled,
                shippingEnabled: seller.shippingEnabled,
                socials: seller.socials,
                wishlistText: seller.wishlistText,
                fulfillmentOptions: seller.fulfillmentOptions?.length > 0
                    ? seller.fulfillmentOptions
                    : [
                        seller.shippingEnabled ? 'shipping' : null,
                        seller.meetupsEnabled ? 'meetups_local' : null,
                    ].filter(Boolean),
                referenceLinks: (seller.referenceLinks as any[]) || [],
                upcomingEvents: (seller.upcomingEvents as any[]) || [],
                avatarUrl: seller.avatarMedia ? this.mediaService.getPublicUrl(seller.avatarMedia, { preferCdn: true }) : null,
                facebookVerifiedAt: seller.user?.facebookVerifiedAt?.toISOString() || null,
                facebookProfileUrl: facebookIdentity?.profileUrl || null,
                email: seller.user?.email || null,
            },
            items,
            itemCount: items.length,
            listedStatuses,
        };
    }
}
