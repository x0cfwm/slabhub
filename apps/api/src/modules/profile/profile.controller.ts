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

@Controller('me')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
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
    async deleteAccount(
        @CurrentUserId() userId: string | undefined,
    ) {
        if (!userId) {
            throw new NotFoundException('No authenticated user');
        }
        return this.profileService.deleteAccount(userId);
    }
}
