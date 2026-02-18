import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3ClientService } from './s3.client';

@Module({
    controllers: [MediaController],
    providers: [
        S3ClientService,
        MediaService,
    ],
    exports: [MediaService],
})
export class MediaModule { }
