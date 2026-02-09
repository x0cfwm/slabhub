export abstract class StorageService {
    /**
     * Uploads a file and returns the public URL or relative path.
     * @param file The file object from multer
     * @param folder Optional folder name
     */
    abstract uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;

    /**
     * Deletes a file by its URL or path.
     * @param path The URL or relative path of the file
     */
    abstract deleteFile(path: string): Promise<void>;

    /**
     * Generates a unique filename while preserving the extension.
     * @param originalName The original filename
     */
    protected generateUniqueName(originalName: string): string {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const ext = originalName.split('.').pop();
        return `${timestamp}-${random}.${ext}`;
    }
}
