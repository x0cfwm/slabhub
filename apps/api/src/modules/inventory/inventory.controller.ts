import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    NotFoundException,
    ParseArrayPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { ReorderInventoryItemDto } from './dto/reorder-inventory-item.dto';
import { CurrentSellerId, CurrentUserId } from '../auth/auth.middleware';
import { InventoryStage } from '@prisma/client';

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

    @Patch('reorder')
    async reorderItems(
        @CurrentUserId() userId: string | undefined,
        @Body(new ParseArrayPipe({ items: ReorderInventoryItemDto })) items: ReorderInventoryItemDto[],
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.reorderItems(userId, items);
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

    @Get('stats/market-value-history')
    async getMarketValueHistory(
        @CurrentUserId() userId: string | undefined,
        @Param('days') days?: string,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        const period = days ? parseInt(days) : 90;
        return this.inventoryService.getMarketValueHistory(userId, period);
    }
}
