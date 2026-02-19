import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { IsEmail, IsOptional, IsString } from 'class-validator';

class JoinWaitlistDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    name?: string;
}

@Controller('waitlist')
export class WaitlistController {
    constructor(private readonly waitlistService: WaitlistService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async join(@Body() dto: JoinWaitlistDto) {
        return this.waitlistService.join(dto.email, dto.name);
    }
}
