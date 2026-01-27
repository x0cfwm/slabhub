export function extractSlug(url: string, prefix: string): string | undefined {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('/').filter(Boolean);
        const index = parts.indexOf(prefix);
        if (index !== -1 && parts[index + 1]) {
            return parts[index + 1];
        }
    } catch (e) {
        // Fallback if not absolute URL
        if (url.includes(`/${prefix}/`)) {
            const parts = url.split(`/${prefix}/`)[1].split('/');
            return parts[0].split('?')[0];
        }
    }
    return undefined;
}

export function canonicalizeUrl(url: string, baseUrl: string = 'https://www.pricecharting.com'): string {
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`.split('?')[0];
}
