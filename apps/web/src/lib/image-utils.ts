/**
 * Cloudflare Image Optimization Utility
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

    // Replace the base URL with optimized path
    // https://cdn.slabhub.gg/some/path.jpg -> https://cdn.slabhub.gg/cdn-cgi/image/params/some/path.jpg
    const path = url.substring(CDN_BASE_URL.length);
    return `${CDN_BASE_URL}/cdn-cgi/image/${paramString}${path}`;
}
