import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfileByUserId(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { sellerProfile: true, oauthIdentities: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const facebookIdentity = user.oauthIdentities?.find(i => i.provider === 'facebook');

        return {
            id: user.id,
            email: user.email,
            facebookVerifiedAt: user.facebookVerifiedAt?.toISOString() || null,
            facebookProfileUrl: facebookIdentity?.profileUrl || null,
            profile: user.sellerProfile ? this.transformProfile(user.sellerProfile) : null,
        };
    }

    async getProfile(sellerId: string) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: sellerId },
            include: { user: { include: { oauthIdentities: true } } },
        });

        if (!seller) {
            // If it's a sellerId that doesn't exist, we might be in a weird state
            throw new NotFoundException('Profile not found');
        }

        const facebookIdentity = seller.user?.oauthIdentities?.find(i => i.provider === 'facebook');

        return {
            id: seller.user?.id || seller.id,
            email: seller.user?.email || '',
            facebookVerifiedAt: seller.user?.facebookVerifiedAt?.toISOString() || null,
            facebookProfileUrl: facebookIdentity?.profileUrl || null,
            profile: this.transformProfile(seller),
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
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
        if (existingProfile) {
            updated = await this.prisma.sellerProfile.update({
                where: { id: existingProfile.id },
                data: { ...dto },
                include: { user: true },
            });
        } else {
            // Create new profile
            if (!dto.handle || !dto.shopName) {
                throw new BadRequestException('Handle and Shop Name are required for new profiles');
            }
            updated = await this.prisma.sellerProfile.create({
                data: {
                    ...(dto as any),
                    handle: dto.handle, // explicitly set for type safety
                    shopName: dto.shopName,
                    userId,
                    locationCountry: dto.locationCountry || '',
                    locationCity: dto.locationCity || '',
                    paymentsAccepted: dto.paymentsAccepted || [],
                },
                include: { user: true },
            });
        }

        return {
            id: updated.user?.id || updated.id,
            email: updated.user?.email || '',
            profile: this.transformProfile(updated),
        };
    }

    private transformProfile(seller: any) {
        return {
            id: seller.id,
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
            createdAt: seller.createdAt.toISOString(),
            updatedAt: seller.updatedAt.toISOString(),
        };
    }
}
