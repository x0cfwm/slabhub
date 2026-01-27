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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const create_inventory_item_dto_1 = require("./dto/create-inventory-item.dto");
const update_inventory_item_dto_1 = require("./dto/update-inventory-item.dto");
const auth_middleware_1 = require("../auth/auth.middleware");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async listItems(sellerId) {
        if (!sellerId) {
            throw new common_1.NotFoundException('No authenticated seller');
        }
        return this.inventoryService.listItems(sellerId);
    }
    async getItem(sellerId, id) {
        if (!sellerId) {
            throw new common_1.NotFoundException('No authenticated seller');
        }
        return this.inventoryService.getItem(sellerId, id);
    }
    async createItem(sellerId, dto) {
        if (!sellerId) {
            throw new common_1.NotFoundException('No authenticated seller');
        }
        return this.inventoryService.createItem(sellerId, dto);
    }
    async updateItem(sellerId, id, dto) {
        if (!sellerId) {
            throw new common_1.NotFoundException('No authenticated seller');
        }
        return this.inventoryService.updateItem(sellerId, id, dto);
    }
    async deleteItem(sellerId, id) {
        if (!sellerId) {
            throw new common_1.NotFoundException('No authenticated seller');
        }
        return this.inventoryService.deleteItem(sellerId, id);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_middleware_1.CurrentSellerId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listItems", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_middleware_1.CurrentSellerId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getItem", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_middleware_1.CurrentSellerId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_inventory_item_dto_1.CreateInventoryItemDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createItem", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, auth_middleware_1.CurrentSellerId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_inventory_item_dto_1.UpdateInventoryItemDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_middleware_1.CurrentSellerId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteItem", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map