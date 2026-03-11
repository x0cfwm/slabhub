import {
    Controller,
    Get,
    Patch,
    Body,
    Delete,
    NotFoundException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentSellerId, CurrentUserId } from '../auth/auth.middleware';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Profile')
@Controller('me')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async getProfile(
        @CurrentUserId() userId: string | undefined,
        @CurrentSellerId() sellerId: string | undefined,
    ) {
        if (userId) {
            return this.profileService.getProfileByUserId(userId);
        }
        if (sellerId) {
            return this.profileService.getProfile(sellerId);
        }
        throw new NotFoundException('No authenticated user or seller');
    }

    @Patch()
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(
        @CurrentUserId() userId: string | undefined,
        @Body() dto: UpdateProfileDto,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.profileService.updateProfile(userId, dto);
    }

    @Delete()
    @ApiOperation({ summary: 'Delete current user account' })
    @ApiResponse({ status: 200, description: 'Account deleted successfully' })
    async deleteAccount(
        @CurrentUserId() userId: string | undefined,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.profileService.deleteAccount(userId);
    }
}
