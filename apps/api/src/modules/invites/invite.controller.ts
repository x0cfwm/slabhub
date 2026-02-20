import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { InviteService } from './invite.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { Request } from 'express';

@Controller('invites')
export class InviteController {
    constructor(private readonly inviteService: InviteService) { }

    @Get('me')
    @UseGuards(SessionGuard)
    async getMyInvite(@Req() req: any) {
        return this.inviteService.getOrCreateMyInvite(req.user.id);
    }

    @Get('accepted')
    @UseGuards(SessionGuard)
    async getAcceptedInvites(@Req() req: any) {
        return this.inviteService.getAcceptedInvites(req.user.id);
    }

    @Get('preview/:token')
    async getInvitePreview(@Param('token') token: string) {
        return this.inviteService.getInvitePreview(token);
    }
}
