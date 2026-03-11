import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { GradingHttpClient } from './http/grading-http.client';
import { GradingRecognitionService } from './grading-recognition.service';
import { MediaModule } from '../media/media.module';
import { GradingTestCommand } from './cli/grading-test.command';

@Module({
    imports: [
        HttpModule,
        MediaModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 1000,
        }]),
    ],
    controllers: [GradingController],
    providers: [
        GradingService,
        GradingRecognitionService,
        GradingHttpClient,
        GradingTestCommand,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [GradingService, GradingRecognitionService],
})
export class GradingModule { }
