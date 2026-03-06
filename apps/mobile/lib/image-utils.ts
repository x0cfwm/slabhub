import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Cloudflare Image Optimization Utility for Mobile
 * Format: {S3_CDN_BASE_URL}/cdn-cgi/image/options/path
 */

const CDN_BASE_URL = 'https://cdn.slabhub.gg';

export interface ImageOptimizationOptions {
    width?: number;
    height?: number;
    quality?: number | 'auto';
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
    format?: 'auto' | 'avif' | 'webp' | 'json';
}

/**
 * Transforms a CDN URL into an optimized Cloudflare Image URL.
 * If the URL is not from the CDN, it returns it as is.
 */
export function getOptimizedImageUrl(url: string | null | undefined, options: ImageOptimizationOptions = {}): string {
    if (!url) return '';

    // Only optimize images from our CDN
    if (!url.startsWith(CDN_BASE_URL)) {
        return url;
    }

    // Skip if already optimized
    if (url.includes('/cdn-cgi/image/')) {
        return url;
    }

    const {
        width,
        height,
        quality,
        fit = 'contain',
        format = 'webp'
    } = options;

    const params: string[] = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    if (quality) params.push(`quality=${quality}`);
    if (fit) params.push(`fit=${fit}`);
    if (format) params.push(`format=${format}`);

    const paramString = params.join(',');

    const path = url.substring(CDN_BASE_URL.length);
    return `${CDN_BASE_URL}/cdn-cgi/image/${paramString}${path}`;
}

/**
 * Optimizes a local image URI by resizing and compressing it before upload.
 */
export async function optimizeLocalImage(uri: string): Promise<string> {
    try {
        // Resize to a max width of 1024px to save bandwidth while keeping enough detail
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (e) {
        console.warn('Failed to optimize image locally:', e);
        return uri;
    }
}
