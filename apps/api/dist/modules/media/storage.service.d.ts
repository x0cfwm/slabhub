export declare abstract class StorageService {
    abstract uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
    abstract deleteFile(path: string): Promise<void>;
    protected generateUniqueName(originalName: string): string;
}
