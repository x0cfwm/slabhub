import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../auth/auth.middleware';
import { GeneratePostDto } from './dto/generate-post.dto';
import { PostingService } from './posting.service';

@ApiTags('Posting')
@Controller('posting')
export class PostingController {
    constructor(private readonly postingService: PostingService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate post text and image bundle from selected inventory items' })
    @ApiResponse({ status: 201, description: 'Post content generated' })
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
}
