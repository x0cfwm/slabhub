import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    Get,
    UseGuards,
    UnauthorizedException
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CookieUtils } from './utils/cookies';
import { SessionGuard } from './guards/session.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('email/request-otp')
    async requestOtp(@Body() dto: RequestOtpDto) {
        return this.authService.requestOtp(dto.email);
    }

    @Post('email/verify-otp')
    async verifyOtp(
        @Body() dto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;

        const { sessionToken, user } = await this.authService.verifyOtp(
            dto.email,
            dto.otp,
            userAgent,
            ip
        );

        CookieUtils.setSessionCookie(res, sessionToken);

        return { ok: true, user };
    }

    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies[process.env.SESSION_COOKIE_NAME || 'slabhub_session'];
        if (token) {
            await this.authService.logout(token);
        }
        CookieUtils.clearSessionCookie(res);
        return { ok: true };
    }
}

@Controller('me')
export class MeController {
    @Get()
    @UseGuards(SessionGuard)
    async getMe(@Req() req: any) {
        const user = req.user;
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            profile: user.sellerProfile,
        };
    }
}
