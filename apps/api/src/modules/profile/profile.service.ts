import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MediaService } from '../media/media.service';

@Injectable()
export class ProfileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mediaService: MediaService,
    ) { }

    async getProfileByUserId(userId: string) {
        const user: any = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { sellerProfile: { include: { avatarMedia: true } }, oauthIdentities: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const facebookIdentity = user.oauthIdentities?.find((i: any) => i.provider === 'facebook');

        return {
            id: user.id,
            email: user.email,
            facebookVerifiedAt: user.facebookVerifiedAt?.toISOString() || null,
            facebookProfileUrl: facebookIdentity?.profileUrl || null,
            profile: user.sellerProfile ? this.transformProfile(user.sellerProfile) : null,
        };
    }

    async getProfile(sellerId: string) {
        const seller: any = await this.prisma.sellerProfile.findUnique({
            where: { id: sellerId },
            include: { user: { include: { oauthIdentities: true } }, avatarMedia: true },
        });

        if (!seller) {
            // If it's a sellerId that doesn't exist, we might be in a weird state
            throw new NotFoundException('Profile not found');
        }

        const facebookIdentity = seller.user?.oauthIdentities?.find((i: any) => i.provider === 'facebook');

        return {
            id: seller.user?.id || seller.id,
            email: seller.user?.email || '',
            facebookVerifiedAt: seller.user?.facebookVerifiedAt?.toISOString() || null,
            facebookProfileUrl: facebookIdentity?.profileUrl || null,
            profile: this.transformProfile(seller),
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        console.log(`[ProfileService] Updating profile for user ${userId}. DTO:`, JSON.stringify(dto, null, 2));

        // Find existing profile for this user
        const existingProfile = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        });

        // Check if handle is being updated and if it's unique
        if (dto.handle) {
            const handleOwner = await this.prisma.sellerProfile.findUnique({
                where: { handle: dto.handle },
            });

            if (handleOwner && handleOwner.userId !== userId) {
                throw new ConflictException('Handle already taken');
            }
        }

        let updated: any;

        // Prepare data for Prisma, specifically ensuring JSON fields are handled correctly
        // We use JSON.stringify/parse to ensure we're passing a plain POJO without class instances
        const updateData: any = JSON.parse(JSON.stringify(dto));

        if (existingProfile) {
            updated = await this.prisma.sellerProfile.update({
                where: { id: existingProfile.id },
                data: updateData,
                include: { user: true, avatarMedia: true },
            });
        } else {
            // Create new profile
            if (!dto.handle || !dto.shopName) {
                throw new BadRequestException('Handle and Shop Name are required for new profiles');
            }
            updated = await this.prisma.sellerProfile.create({
                data: {
                    ...updateData,
                    handle: dto.handle,
                    shopName: dto.shopName,
                    userId,
                    location: dto.location || '',
                    shippingEnabled: dto.shippingEnabled ?? false,
                    avatarId: dto.avatarId,
                },
                include: { user: true, avatarMedia: true },
            });
        }

        return {
            id: updated.user?.id || updated.id,
            email: updated.user?.email || '',
            profile: this.transformProfile(updated),
        };
    }

    async deleteAccount(userId: string) {
        // 1. Force logout by deleting sessions
        await this.prisma.session.deleteMany({
            where: { userId },
        });

        // 2. Count existing removed accounts to get the next number
        // We look for emails matching the pattern removed-<number>@slabhub.gg
        const removedUsers = await this.prisma.user.findMany({
            where: {
                email: {
                    startsWith: 'removed-',
                    endsWith: '@slabhub.gg'
                }
            },
            select: { email: true }
        });

        let nextNumber = 1;
        if (removedUsers.length > 0) {
            const numbers = removedUsers
                .map(u => {
                    const match = u.email.match(/removed-(\d+)@slabhub\.gg/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(n => !isNaN(n));

            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }

        const placeholderEmail = `removed-${nextNumber}@slabhub.gg`;

        // 3. Delete the seller profile if it exists (cascade will handle inventory if configured, 
        // but we'll also delete inventory items explicitly to be safe as user wants to "delete whole profile")
        await this.prisma.inventoryItem.deleteMany({
            where: { userId }
        });

        await this.prisma.sellerProfile.deleteMany({
            where: { userId }
        });

        // 4. Update the user to anonymized state
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                email: placeholderEmail,
                emailVerifiedAt: null,
            },
        });

        return { success: true };
    }

    private transformProfile(seller: any) {
        return {
            id: seller.id,
            handle: seller.handle,
            shopName: seller.shopName,
            isActive: seller.isActive,
            location: seller.location,
            paymentsAccepted: seller.paymentsAccepted,
            meetupsEnabled: seller.meetupsEnabled,
            shippingEnabled: seller.shippingEnabled,
            fulfillmentOptions: this.getFulfillmentOptions(seller),
            socials: seller.socials,
            wishlistText: seller.wishlistText,
            referenceLinks: (seller.referenceLinks as any[]) || [],
            upcomingEvents: (seller.upcomingEvents as any[]) || [],
            avatarId: seller.avatarId,
            avatarUrl: seller.avatarMedia ? this.mediaService.getPublicUrl(seller.avatarMedia, { preferCdn: true }) : null,
            createdAt: seller.createdAt.toISOString(),
            updatedAt: seller.updatedAt.toISOString(),
        };
    }

    private getFulfillmentOptions(seller: any): string[] {
        // If the new field has values, use them
        if (seller.fulfillmentOptions && seller.fulfillmentOptions.length > 0) {
            return seller.fulfillmentOptions;
        }

        // Fallback to legacy boolean fields
        const options: string[] = [];
        if (seller.shippingEnabled) options.push('shipping');
        if (seller.meetupsEnabled) options.push('meetups_local');
        return options;
    }
}
