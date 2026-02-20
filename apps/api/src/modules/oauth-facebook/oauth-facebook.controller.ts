import { Controller, Get, Req, Res, Query, UseGuards, Delete } from '@nestjs/common';
import { Request, Response } from 'express';
import { OauthFacebookService } from './oauth-facebook.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('auth/facebook')
export class OauthFacebookController {
    constructor(private readonly facebookService: OauthFacebookService) { }

    @Get()
    login(@Res() res: Response, @Query('invite') inviteToken?: string) {
        const url = this.facebookService.getLoginUrl(inviteToken);
        res.redirect(url);
    }

    @Get('callback')
    async callback(
        @Query('code') code: string,
        @Query('error') error: string,
        @Query('state') state: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (error || !code) {
            const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
            return res.redirect(`${webOrigin}/login?error=facebook_oauth_denied`);
        }

        const userAgent = req.headers['user-agent'];
        const ip = req.ip;
        const token = req.cookies[process.env.SESSION_COOKIE_NAME || 'slabhub_session'];

        return this.facebookService.handleCallback(code, res, state, token, userAgent, ip);
    }

    @Delete()
    @UseGuards(SessionGuard)
    async disconnect(@CurrentUserId() userId: string) {
        return this.facebookService.disconnect(userId);
    }
}
