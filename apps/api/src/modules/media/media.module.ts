import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';

@Module({
    controllers: [MediaController],
    providers: [
        {
            provide: StorageService,
            useClass: LocalStorageService,
        },
    ],
    exports: [StorageService],
})
export class MediaModule { }
