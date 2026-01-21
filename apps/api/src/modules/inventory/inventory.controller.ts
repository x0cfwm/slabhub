import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CurrentSellerId } from '../auth/auth.middleware';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    async listItems(@CurrentSellerId() sellerId: string | undefined) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.inventoryService.listItems(sellerId);
    }

    @Get(':id')
    async getItem(
        @CurrentSellerId() sellerId: string | undefined,
        @Param('id') id: string,
    ) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.inventoryService.getItem(sellerId, id);
    }

    @Post()
    async createItem(
        @CurrentSellerId() sellerId: string | undefined,
        @Body() dto: CreateInventoryItemDto,
    ) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.inventoryService.createItem(sellerId, dto);
    }

    @Patch(':id')
    async updateItem(
        @CurrentSellerId() sellerId: string | undefined,
        @Param('id') id: string,
        @Body() dto: UpdateInventoryItemDto,
    ) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.inventoryService.updateItem(sellerId, id, dto);
    }

    @Delete(':id')
    async deleteItem(
        @CurrentSellerId() sellerId: string | undefined,
        @Param('id') id: string,
    ) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.inventoryService.deleteItem(sellerId, id);
    }
}
