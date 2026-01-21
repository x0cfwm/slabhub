import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfile(sellerId: string) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: sellerId },
        });

        if (!seller) {
            throw new NotFoundException('Profile not found');
        }

        return this.transformProfile(seller);
    }

    async updateProfile(sellerId: string, dto: UpdateProfileDto) {
        // Check if handle is being updated and if it's unique
        if (dto.handle) {
            const existing = await this.prisma.sellerProfile.findUnique({
                where: { handle: dto.handle },
            });

            if (existing && existing.id !== sellerId) {
                throw new ConflictException('Handle already taken');
            }
        }

        const updated = await this.prisma.sellerProfile.update({
            where: { id: sellerId },
            data: dto,
        });

        return this.transformProfile(updated);
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
