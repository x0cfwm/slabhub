import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const media = await this.mediaService.putBuffer({
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalFilename: file.originalname,
        });

        return {
            mediaId: media.id,
            url: this.mediaService.getPublicUrl(media, { preferCdn: true }),
            hash: media.hash,
            mimeType: media.mimeType,
            sizeBytes: media.sizeBytes,
        };
    }
}
