import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
export declare class LocalStorageService extends StorageService {
    private readonly configService;
    private readonly uploadDir;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    private ensureUploadDir;
    uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
}
