import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalStorageService extends StorageService {
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        super();
        this.uploadDir = path.join(process.cwd(), 'uploads');
        // In local dev, we might use a direct URL. In production, this should be the API URL.
        const port = this.configService.get('PORT') || '3001';
        this.baseUrl = `http://localhost:${port}/uploads`;

        // Ensure upload directory exists
        this.ensureUploadDir();
    }

    private async ensureUploadDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create upload directory', error);
        }
    }

    async uploadFile(file: Express.Multer.File, folder: string = ''): Promise<string> {
        try {
            const fileName = this.generateUniqueName(file.originalname);
            const targetFolder = path.join(this.uploadDir, folder);
            await fs.mkdir(targetFolder, { recursive: true });

            const filePath = path.join(targetFolder, fileName);
            await fs.writeFile(filePath, file.buffer);

            // Return the URL-friendly path
            const relativePath = folder ? `${folder}/${fileName}` : fileName;
            return `${this.baseUrl}/${relativePath}`;
        } catch (error) {
            throw new InternalServerErrorException('Failed to upload file locally');
        }
    }

    async deleteFile(fileUrl: string): Promise<void> {
        try {
            // Strip the baseUrl to get the relative path
            const relativePath = fileUrl.replace(this.baseUrl, '');
            if (!relativePath || relativePath === fileUrl) {
                console.warn(`URL does not match baseUrl: ${fileUrl}`);
                return;
            }

            // Remove leading slash if any
            const sanitizedPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            const filePath = path.join(this.uploadDir, sanitizedPath);

            await fs.unlink(filePath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.warn(`File already deleted: ${fileUrl}`);
            } else {
                console.warn(`Failed to delete file: ${fileUrl}`, error);
            }
        }
    }

}
