import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { GradingHttpClient } from './http/grading-http.client';

@Module({
    imports: [
        HttpModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 1000,
        }]),
    ],
    controllers: [GradingController],
    providers: [
        GradingService,
        GradingHttpClient,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [GradingService],
})
export class GradingModule { }
