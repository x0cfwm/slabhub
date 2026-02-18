import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3ClientService {
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor(private readonly configService: ConfigService) {
        this.bucket = this.configService.get<string>('S3_BUCKET', '');

        this.client = new S3Client({
            endpoint: this.configService.get<string>('S3_ENDPOINT'),
            region: this.configService.get<string>('S3_REGION'),
            credentials: {
                accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID', ''),
                secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY', ''),
            },
            forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', false),
        });
    }

    getClient(): S3Client {
        return this.client;
    }

    getBucket(): string {
        return this.bucket;
    }
}
