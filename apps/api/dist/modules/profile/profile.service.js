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
    async getProfile(sellerId) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: sellerId },
        });
        if (!seller) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return this.transformProfile(seller);
    }
    async updateProfile(sellerId, dto) {
        if (dto.handle) {
            const existing = await this.prisma.sellerProfile.findUnique({
                where: { handle: dto.handle },
            });
            if (existing && existing.id !== sellerId) {
                throw new common_1.ConflictException('Handle already taken');
            }
        }
        const updated = await this.prisma.sellerProfile.update({
            where: { id: sellerId },
            data: dto,
        });
        return this.transformProfile(updated);
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