import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    NotFoundException,
    ParseArrayPipe,
} from '@nestjs/common';
import { InventoryStatusService } from './inventory-status.service';
import { CreateInventoryStatusDto, UpdateInventoryStatusDto, ReorderInventoryStatusDto } from './dto/inventory-status.dto';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('workflow/statuses')
export class InventoryStatusController {
    constructor(private readonly statusService: InventoryStatusService) { }

    @Get()
    async listStatuses(@CurrentUserId() userId: string | undefined) {
        if (!userId) throw new NotFoundException('No authenticated user');
        return this.statusService.listStatuses(userId);
    }

    @Post()
    async createStatus(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: CreateInventoryStatusDto,
    ) {
        if (!userId) throw new NotFoundException('No authenticated user');
        return this.statusService.createStatus(userId, dto);
    }

    @Patch('reorder')
    async reorderStatuses(
        @CurrentUserId() userId: string | undefined,
        @Body(new ParseArrayPipe({ items: ReorderInventoryStatusDto })) items: ReorderInventoryStatusDto[],
    ) {
        if (!userId) throw new NotFoundException('No authenticated user');
        return this.statusService.reorderStatuses(userId, items);
    }

    @Patch(':id')
    async updateStatus(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
        @Body() dto: UpdateInventoryStatusDto,
    ) {
        if (!userId) throw new NotFoundException('No authenticated user');
        return this.statusService.updateStatus(userId, id, dto);
    }

    @Delete(':id')
    async deleteStatus(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
        @Query('moveTo') moveItemsToStatusId?: string,
    ) {
        if (!userId) throw new NotFoundException('No authenticated user');
        return this.statusService.deleteStatus(userId, id, moveItemsToStatusId);
    }
}
