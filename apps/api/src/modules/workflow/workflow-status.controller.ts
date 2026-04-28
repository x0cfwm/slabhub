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
import { WorkflowStatusService } from './workflow-status.service';
import { CreateWorkflowStatusDto, UpdateWorkflowStatusDto, ReorderWorkflowStatusDto } from './dto/workflow-status.dto';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('workflow/statuses')
export class WorkflowStatusController {
    constructor(private readonly statusService: WorkflowStatusService) { }

    @Get()
    async listStatuses(
        @CurrentUserId() userId: string | undefined,
        @Query('includeDisabled') includeDisabled?: string,
    ) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.listStatuses(userId, includeDisabled === 'true');
    }

    @Post('seed')
    async seedStatuses(@CurrentUserId() userId: string | undefined) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.seedStatuses(userId);
    }

    @Post()
    async createStatus(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: CreateWorkflowStatusDto,
    ) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.createStatus(userId, dto);
    }

    @Patch('reorder')
    async reorderStatuses(
        @CurrentUserId() userId: string | undefined,
        @Body(new ParseArrayPipe({ items: ReorderWorkflowStatusDto })) items: ReorderWorkflowStatusDto[],
    ) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.reorderStatuses(userId, items);
    }

    @Patch(':id')
    async updateStatus(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
        @Body() dto: UpdateWorkflowStatusDto,
    ) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.updateStatus(userId, id, dto);
    }

    @Delete(':id')
    async deleteStatus(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
        @Query('moveTo') moveItemsToStatusId?: string,
    ) {
        if (!userId) {throw new NotFoundException('No authenticated user');}
        return this.statusService.deleteStatus(userId, id, moveItemsToStatusId);
    }
}
