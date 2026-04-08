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
import { AppleLoginDto } from './dto/apple-login.dto';
import { CookieUtils } from './utils/cookies';
import { SessionGuard } from './guards/session.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('email/request-otp')
    @ApiOperation({ summary: 'Request OTP via email' })
    @ApiResponse({ status: 201, description: 'OTP sent successfully' })
    async requestOtp(@Body() dto: RequestOtpDto) {
        return this.authService.requestOtp(dto.email, dto.inviteToken);
    }

    @Post('email/verify-otp')
    @ApiOperation({ summary: 'Verify OTP and start session' })
    @ApiResponse({ status: 200, description: 'OTP verified successfully' })
    @ApiResponse({ status: 401, description: 'Invalid OTP' })
    async verifyOtp(
        @Body() dto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        console.log(`[AuthController] Verifying OTP for ${dto.email}...`);
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;

        const { sessionToken, user } = await this.authService.verifyOtp(
            dto.email,
            dto.otp,
            userAgent,
            ip,
            dto.inviteToken
        );

        CookieUtils.setSessionCookie(res, sessionToken);

        return { ok: true, user, sessionToken };
    }

    @Post('apple')
    @ApiOperation({ summary: 'Login or signup with Apple ID' })
    @ApiResponse({ status: 200, description: 'Apple login successful' })
    @ApiResponse({ status: 401, description: 'Invalid Apple token' })
    async loginWithApple(
        @Body() dto: AppleLoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        console.log(`[AuthController] Logging in with Apple...`);
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;

        const { sessionToken, user } = await this.authService.signInWithApple(
            dto.identityToken,
            dto.fullName,
            userAgent,
            ip,
            dto.inviteToken
        );

        CookieUtils.setSessionCookie(res, sessionToken);

        return { ok: true, user, sessionToken };
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout and clear session' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies[process.env.SESSION_COOKIE_NAME || 'slabhub_session'];
        if (token) {
            await this.authService.logout(token);
        }
        CookieUtils.clearSessionCookie(res);
        return { ok: true };
    }
}
