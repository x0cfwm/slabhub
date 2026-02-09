import { StorageService } from './storage.service';
export declare class MediaController {
    private readonly storageService;
    constructor(storageService: StorageService);
    uploadFile(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    deleteFile(url: string): Promise<{
        success: boolean;
    }>;
}
