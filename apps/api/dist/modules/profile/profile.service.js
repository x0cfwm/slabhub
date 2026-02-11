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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProfileService = class ProfileService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfileByUserId(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { sellerProfile: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            id: user.id,
            email: user.email,
            profile: user.sellerProfile ? this.transformProfile(user.sellerProfile) : null,
        };
    }
    async getProfile(sellerId) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: sellerId },
            include: { user: true },
        });
        if (!seller) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return {
            id: seller.user?.id || seller.id,
            email: seller.user?.email || '',
            profile: this.transformProfile(seller),
        };
    }
    async updateProfile(userId, dto) {
        const existingProfile = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        });
        if (dto.handle) {
            const handleOwner = await this.prisma.sellerProfile.findUnique({
                where: { handle: dto.handle },
            });
            if (handleOwner && handleOwner.userId !== userId) {
                throw new common_1.ConflictException('Handle already taken');
            }
        }
        let updated;
        if (existingProfile) {
            updated = await this.prisma.sellerProfile.update({
                where: { id: existingProfile.id },
                data: { ...dto },
                include: { user: true },
            });
        }
        else {
            if (!dto.handle || !dto.shopName) {
                throw new common_1.BadRequestException('Handle and Shop Name are required for new profiles');
            }
            updated = await this.prisma.sellerProfile.create({
                data: {
                    ...dto,
                    handle: dto.handle,
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
    transformProfile(seller) {
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
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map