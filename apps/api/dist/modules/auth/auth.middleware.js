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
exports.CurrentSellerHandle = exports.CurrentSellerId = exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULT_SELLER_HANDLE = 'nami-treasures';
let AuthMiddleware = class AuthMiddleware {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async use(req, res, next) {
        const handleFromHeader = req.headers['x-user-handle'];
        const idFromHeader = req.headers['x-user-id'];
        let seller = null;
        if (idFromHeader) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { id: idFromHeader },
            });
        }
        else if (handleFromHeader) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { handle: handleFromHeader },
            });
        }
        if (!seller) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { handle: DEFAULT_SELLER_HANDLE },
            });
        }
        if (seller) {
            req.sellerId = seller.id;
            req.sellerHandle = seller.handle;
        }
        next();
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthMiddleware);
exports.CurrentSellerId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.sellerId;
});
exports.CurrentSellerHandle = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.sellerHandle;
});
//# sourceMappingURL=auth.middleware.js.map