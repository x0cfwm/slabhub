import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async getHealth() {
        let dbStatus = 'healthy';
        let dbLatency = 0;

        try {
            const start = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            dbLatency = Date.now() - start;
        } catch {
            dbStatus = 'unhealthy';
        }

        return {
            status: dbStatus === 'healthy' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                database: {
                    status: dbStatus,
                    latencyMs: dbLatency,
                },
            },
        };
    }
}
