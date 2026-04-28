import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/auth.middleware';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
    constructor(private readonly moderation: ModerationService) { }

    @Post('reports')
    @ApiOperation({ summary: 'Report a vendor or item as abusive' })
    @ApiResponse({ status: 201, description: 'Report recorded' })
    async createReport(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: CreateReportDto,
    ) {
        if (!userId) {throw new UnauthorizedException('Authentication required');}
        return this.moderation.createReport(userId, dto);
    }

    @Post('blocks')
    @ApiOperation({ summary: 'Block a user (by userId or vendor handle)' })
    @ApiResponse({ status: 201, description: 'User blocked' })
    async createBlock(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: CreateBlockDto,
    ) {
        if (!userId) {throw new UnauthorizedException('Authentication required');}
        return this.moderation.createBlock(userId, dto);
    }

    @Delete('blocks/:userId')
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiResponse({ status: 200, description: 'User unblocked' })
    async removeBlock(
        @CurrentUserId() blockerId: string | undefined,
        @Param('userId') targetUserId: string,
    ) {
        if (!blockerId) {throw new UnauthorizedException('Authentication required');}
        return this.moderation.removeBlock(blockerId, targetUserId);
    }

    @Get('blocks')
    @ApiOperation({ summary: 'List users you have blocked' })
    @ApiResponse({ status: 200, description: 'List of blocks' })
    async listBlocks(@CurrentUserId() userId: string | undefined) {
        if (!userId) {throw new UnauthorizedException('Authentication required');}
        return this.moderation.listBlocks(userId);
    }
}
