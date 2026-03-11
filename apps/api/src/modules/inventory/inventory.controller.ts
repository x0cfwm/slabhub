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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    @ApiOperation({ summary: 'List all inventory items' })
    @ApiResponse({ status: 200, description: 'List of inventory items' })
    async listItems(@CurrentUserId() userId: string | undefined) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.inventoryService.listItems(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific inventory item' })
    @ApiParam({ name: 'id', description: 'Inventory item ID' })
    @ApiResponse({ status: 200, description: 'Inventory item details' })
    @ApiResponse({ status: 404, description: 'Item not found' })
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
    @ApiOperation({ summary: 'Create a new inventory item' })
    @ApiResponse({ status: 201, description: 'Item created successfully' })
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
    @ApiOperation({ summary: 'Reorder inventory items' })
    @ApiResponse({ status: 200, description: 'Items reordered successfully' })
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
    @ApiOperation({ summary: 'Update an inventory item' })
    @ApiParam({ name: 'id', description: 'Inventory item ID' })
    @ApiResponse({ status: 200, description: 'Item updated successfully' })
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
    @ApiOperation({ summary: 'Delete an inventory item' })
    @ApiParam({ name: 'id', description: 'Inventory item ID' })
    @ApiResponse({ status: 200, description: 'Item deleted successfully' })
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
    @ApiOperation({ summary: 'Get market value history' })
    @ApiParam({ name: 'days', required: false, description: 'Number of days for history', example: '90' })
    @ApiResponse({ status: 200, description: 'Market value history' })
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
