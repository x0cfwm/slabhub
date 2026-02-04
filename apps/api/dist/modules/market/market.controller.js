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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPricingController = void 0;
const common_1 = require("@nestjs/common");
const market_service_1 = require("./market.service");
const market_products_dto_1 = require("./dto/market-products.dto");
let MarketPricingController = class MarketPricingController {
    constructor(marketService) {
        this.marketService = marketService;
    }
    async getProducts(query) {
        return this.marketService.listProducts(query);
    }
    async getSets() {
        return this.marketService.listSets();
    }
    async getProductPrices(id, strict, refresh) {
        return this.marketService.getProductPriceHistory(id, strict === 'true', refresh === 'true');
    }
};
exports.MarketPricingController = MarketPricingController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [market_products_dto_1.GetMarketProductsDto]),
    __metadata("design:returntype", Promise)
], MarketPricingController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('sets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketPricingController.prototype, "getSets", null);
__decorate([
    (0, common_1.Get)('products/:id/prices'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('strict')),
    __param(2, (0, common_1.Query)('refresh')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MarketPricingController.prototype, "getProductPrices", null);
exports.MarketPricingController = MarketPricingController = __decorate([
    (0, common_1.Controller)('market'),
    __metadata("design:paramtypes", [market_service_1.MarketPricingService])
], MarketPricingController);
//# sourceMappingURL=market.controller.js.map