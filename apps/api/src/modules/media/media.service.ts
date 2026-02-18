import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3ClientService } from './s3.client';
import { computeHash, generateObjectKey } from './hashing';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as mime from 'mime-types';
import { Media } from '@prisma/client';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly allowedMimeTypes: string[];
    private readonly maxSizeBytes: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly s3ClientService: S3ClientService,
        private readonly configService: ConfigService,
    ) {
        this.allowedMimeTypes = this.configService
            .get<string>('S3_ALLOWED_MIME', 'image/jpeg,image/png,image/webp')
            .split(',');
        this.maxSizeBytes = this.configService.get<number>(
            'S3_UPLOAD_MAX_BYTES',
            15728640,
        );
    }

    /**
     * Uploads a buffer to S3, deduplicates by content hash, and stores metadata in DB.
     */
    async putBuffer(params: {
        buffer: Buffer;
        mimeType: string;
        originalFilename?: string;
        ownerUserId?: string;
        sourceUrl?: string;
    }): Promise<Media> {
        const { buffer, mimeType, originalFilename, ownerUserId, sourceUrl } = params;

        // 1. Validate size and mime type
        if (buffer.length > this.maxSizeBytes) {
            throw new BadRequestException('File size exceeds maximum allowed');
        }

        if (!this.allowedMimeTypes.includes(mimeType)) {
            throw new BadRequestException(`Mime type ${mimeType} is not allowed`);
        }

        // 2. Compute hash
        const hash = computeHash(buffer);

        // 3. Check for existing media (deduplication)
        const existingMedia = await this.prisma.media.findUnique({
            where: { hash },
        });

        if (existingMedia) {
            this.logger.log(`Deduplicated file with hash ${hash.substring(0, 8)}...`);
            return existingMedia;
        }

        // 4. Determine extension and key
        const extension = mime.extension(mimeType) || 'bin';
        const extWithDot = `.${extension}`;
        const key = generateObjectKey(hash, extWithDot);

        // 5. Upload to S3
        try {
            const command = new PutObjectCommand({
                Bucket: this.s3ClientService.getBucket(),
                Key: key,
                Body: buffer,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
                ACL: 'public-read',
            });

            const result = await this.s3ClientService.getClient().send(command);

            // 6. Store in database
            const media = await this.prisma.media.create({
                data: {
                    hash,
                    ext: extension,
                    mimeType,
                    sizeBytes: buffer.length,
                    bucket: this.s3ClientService.getBucket(),
                    key,
                    etag: result.ETag?.replace(/"/g, ''), // ETag is often wrapped in quotes
                    ownerUserId,
                    sourceUrl,
                },
            });

            this.logger.log(
                `Stored new media: id=${media.id}, hash=${hash.substring(0, 8)}, size=${media.sizeBytes}`,
            );
            return media;
        } catch (error) {
            this.logger.error(`Failed to upload to S3 or store in DB: ${error.message}`, error.stack);
            this.logger.error(`Context: Bucket=${this.s3ClientService.getBucket()}, Key=${key}`);
            if (error.$metadata) {
                this.logger.error(`S3 Error Metadata: ${JSON.stringify(error.$metadata)}`);
            }
            throw new InternalServerErrorException('Failed to process and store file');
        }
    }

    /**
     * Downloads a file from a remote URL and stores it using putBuffer.
     */
    async putFromRemoteUrl(
        url: string,
        options: { ownerUserId?: string; sourceUrl?: string } = {},
    ): Promise<Media> {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                maxContentLength: this.maxSizeBytes,
                timeout: 30000, // 30 seconds
                maxRedirects: 3,
            });

            const buffer = Buffer.from(response.data);
            const mimeType =
                response.headers['content-type'] || 'application/octet-stream';

            return await this.putBuffer({
                buffer,
                mimeType,
                ownerUserId: options.ownerUserId,
                sourceUrl: options.sourceUrl || url,
            });
        } catch (error) {
            this.logger.error(`Failed to download from remote URL ${url}: ${error.message}`);
            throw new InternalServerErrorException('Failed to ingest remote file');
        }
    }

    /**
     * Generates a stable public or CDN URL for a media record.
     */
    getPublicUrl(media: Media, options: { preferCdn?: boolean } = {}): string {
        const cdnBase = this.configService.get<string>('S3_CDN_BASE_URL');
        const publicBase = this.configService.get<string>('S3_PUBLIC_BASE_URL');

        if (options.preferCdn && cdnBase) {
            return `${cdnBase.replace(/\/$/, '')}/${media.key}`;
        }

        if (publicBase) {
            return `${publicBase.replace(/\/$/, '')}/${media.key}`;
        }

        // Fallback to deriving from endpoint if no base URLs configured
        const endpoint = this.configService.get<string>('S3_ENDPOINT', '');
        const bucket = this.s3ClientService.getBucket();

        // Handle path-style or virtual-hosted style
        if (this.configService.get<boolean>('S3_FORCE_PATH_STYLE', false)) {
            return `${endpoint.replace(/\/$/, '')}/${bucket}/${media.key}`;
        } else {
            // nyc3.digitaloceanspaces.com -> bucket.nyc3.digitaloceanspaces.com
            const url = new URL(endpoint);
            return `${url.protocol}//${bucket}.${url.host}/${media.key}`;
        }
    }
}
