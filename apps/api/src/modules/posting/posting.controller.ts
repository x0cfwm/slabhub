import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/auth.middleware';
import { GeneratePostDto, PostingHistoryQueryDto } from './dto/generate-post.dto';
import { PostingService } from './posting.service';

@ApiTags('Posting')
@Controller('posting')
export class PostingController {
    constructor(private readonly postingService: PostingService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate post text and image bundle from selected inventory items' })
    @ApiResponse({ status: 201, description: 'Post content generated and saved to history' })
    @ApiResponse({ status: 400, description: 'Invalid selection or generation options' })
    async generatePost(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: GeneratePostDto,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.postingService.generatePost(userId, dto);
    }

    @Get('history')
    @ApiOperation({ summary: 'List generated post history for the current user' })
    @ApiResponse({ status: 200, description: 'Generated post history list' })
    async listHistory(
        @CurrentUserId() userId: string | undefined,
        @Query() query: PostingHistoryQueryDto,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.postingService.listHistory(userId, query);
    }

    @Get('history/:id')
    @ApiOperation({ summary: 'Get a specific generated post history entry' })
    @ApiParam({ name: 'id', description: 'Generated post ID' })
    @ApiResponse({ status: 200, description: 'Generated post history entry' })
    @ApiResponse({ status: 404, description: 'Entry not found' })
    async getHistoryEntry(
        @CurrentUserId() userId: string | undefined,
        @Param('id') id: string,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.postingService.getHistoryEntry(userId, id);
    }
}
