import { Controller, Post, Body, UseGuards, HttpStatus, HttpCode, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingLookupDto } from './dto/lookup.dto';
import { GradingLookupResult, GradingRecognitionResult } from './types/grading.types';
import { GradingRecognitionService } from './grading-recognition.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('grading')
export class GradingController {
    constructor(
        private readonly gradingService: GradingService,
        private readonly recognitionService: GradingRecognitionService,
        private readonly mediaService: MediaService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('lookup')
    @HttpCode(HttpStatus.OK)
    async lookup(@Body() lookupDto: GradingLookupDto): Promise<GradingLookupResult> {
        return this.gradingService.lookup(lookupDto);
    }

    @Post('recognize')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async recognize(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUserId() userId: string | undefined,
        @Body('mediaId') mediaId?: string,
    ): Promise<GradingRecognitionResult> {
        let buffer: Buffer;
        let mimeType: string;

        if (file) {
            console.log(`[DEBUG recognize] Received file: origName=${file.originalname}, mimetype=${file.mimetype}, size=${file.size}, bufferLen=${file.buffer?.length}`);
            buffer = file.buffer;
            mimeType = file.mimetype;

        } else if (mediaId) {
            const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
            if (!media) {
                throw new BadRequestException('Media not found');
            }
            // In a real scenario, we would download it from S3 or use the buffer if stored.
            // For now, let's assume we need to download it if we only have the key.
            // However, MediaService doesn't seem to have a getBuffer method.
            // Let's implement a simple fetch if it's stored in S3.
            throw new BadRequestException('Media ID recognition is not yet fully implemented (requires S3 download)');
        } else {
            throw new BadRequestException('Either file or mediaId is required');
        }

        return this.recognitionService.recognizeFromImage(buffer, mimeType, { userId });
    }
}
