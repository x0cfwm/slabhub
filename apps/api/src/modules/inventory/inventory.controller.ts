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
import { CurrentSellerId, CurrentUserId } from '../auth/auth.middleware';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    async listItems(@CurrentUserId() userId: string | undefined) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.listItems(userId);
    }

    @Get(':id')
    async getItem(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.getItem(userId, id);
    }

    @Post()
    async createItem(
        @CurrentUserId() userId: string | undefined,
        @CurrentSellerId() sellerId: string | undefined,
        @Body() dto: CreateInventoryItemDto,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.createItem(userId, sellerId, dto);
    }

    @Patch(':id')
    async updateItem(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
        @Body() dto: UpdateInventoryItemDto,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.updateItem(userId, id, dto);
    }

    @Delete(':id')
    async deleteItem(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.deleteItem(userId, id);
    }
}
