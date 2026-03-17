import { Body, Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { CurrentUserId } from '../auth/auth.middleware';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track a shop interaction event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] as string | undefined;

    return this.analyticsService.trackEvent({
      ...dto,
      ip,
      userAgent,
      referrer,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics stats for the seller dashboard' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getDashboardStats(
    @CurrentUserId() userId: string | undefined,
    @Query('days') days?: string
  ) {
    if (!userId) {
        throw new UnauthorizedException('Authentication required');
    }
    const period = days ? parseInt(days, 10) : 7;
    return this.analyticsService.getDashboardStats(userId, period);
  }
}
