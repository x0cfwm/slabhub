import {
    Controller,
    Get,
    Patch,
    Body,
    NotFoundException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentSellerId } from '../auth/auth.middleware';

@Controller('me')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
    async getProfile(@CurrentSellerId() sellerId: string | undefined) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.profileService.getProfile(sellerId);
    }

    @Patch()
    async updateProfile(
        @CurrentSellerId() sellerId: string | undefined,
        @Body() dto: UpdateProfileDto,
    ) {
        if (!sellerId) {
            throw new NotFoundException('No authenticated seller');
        }
        return this.profileService.updateProfile(sellerId, dto);
    }
}
