import { createHash } from 'crypto';

/**
 * Computes SHA-256 hash of a buffer.
 * @param buffer The file content buffer
 * @returns The hex-encoded hash string
 */
export function computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates an object key based on the hash.
 * Pattern: media/{hash[0..1]}/{hash[2..3]}/{hash}{extWithDot}
 * @param hash The SHA-256 hex hash
 * @param extension The file extension including the dot (e.g., '.jpg')
 * @returns The S3 object key
 */
export function generateObjectKey(hash: string, extension: string): string {
    const p1 = hash.substring(0, 2);
    const p2 = hash.substring(2, 4);
    return `media/${p1}/${p2}/${hash}${extension}`;
}
