import {
    Controller,
    Post,
    Delete,
    Body,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('media')
export class MediaController {
    constructor(private readonly storageService: StorageService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const url = await this.storageService.uploadFile(file, 'inventory');
        return { url };
    }

    @Delete()
    async deleteFile(@Body('url') url: string) {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        await this.storageService.deleteFile(url);
        return { success: true };
    }
}
