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
exports.VendorController = void 0;
const common_1 = require("@nestjs/common");
const vendor_service_1 = require("./vendor.service");
let VendorController = class VendorController {
    constructor(vendorService) {
        this.vendorService = vendorService;
    }
    async getVendorPage(handle) {
        return this.vendorService.getVendorPage(handle);
    }
};
exports.VendorController = VendorController;
__decorate([
    (0, common_1.Get)(':handle'),
    __param(0, (0, common_1.Param)('handle')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VendorController.prototype, "getVendorPage", null);
exports.VendorController = VendorController = __decorate([
    (0, common_1.Controller)('vendor'),
    __metadata("design:paramtypes", [vendor_service_1.VendorService])
], VendorController);
//# sourceMappingURL=vendor.controller.js.map