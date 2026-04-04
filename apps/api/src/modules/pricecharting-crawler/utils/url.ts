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

/**
 * Distills marketplace URLs to remove referral and tracking parameters.
 * Handles TCGplayer referral links and eBay item tracking codes.
 * 
 * @param url The marketplace URL to distill
 * @returns Normalised URL without tracking/referral components
 */
export function distillMarketplaceUrl(url: string): string {
    if (!url) return url;

    try {
        const urlObj = new URL(url);

        // 1. TCGplayer Referral Link Handler (partner.tcgplayer.com)
        if (urlObj.hostname.includes('partner.tcgplayer.com')) {
            const destUrl = urlObj.searchParams.get('u');
            if (destUrl) {
                // Recursively distill the destination URL
                return distillMarketplaceUrl(decodeURIComponent(destUrl));
            }
        }

        // 2. TCGplayer Product URL Handler
        if (urlObj.hostname.includes('tcgplayer.com') && urlObj.pathname.includes('/product/')) {
            // Path structure: /product/<id>/<title>
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const productIndex = parts.indexOf('product');
            if (productIndex !== -1 && parts[productIndex + 1]) {
                const productId = parts[productIndex + 1];
                // Strip query and fragments
                urlObj.search = '';
                urlObj.hash = '';
                // Simplify to just /product/<id> if we want, but let's keep it safe
                // Actually, PriceCharting often has /product/<id>/- (with a dash at the end)
                const distilledPath = `/product/${productId}`;
                return `${urlObj.protocol}//${urlObj.hostname}${distilledPath}`;
            }
        }

        // 3. eBay Item URL Handler
        if (urlObj.hostname.split('.').includes('ebay') && urlObj.pathname.includes('/itm/')) {
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const itmIndex = parts.indexOf('itm');
            if (itmIndex !== -1 && parts[itmIndex + 1]) {
                const itemId = parts[itmIndex + 1];
                // Simplify path to /itm/<id> and remove all query params
                urlObj.search = '';
                urlObj.hash = '';
                return `${urlObj.protocol}//${urlObj.hostname}/itm/${itemId}`;
            }
        }

        // 4. General Fallback: If it's a known marketplace or has common tracking params
        // For any other URL, at least remove common tracking parameters if possible
        // But for safety, let's just strip all query parameters if it's NOT a PriceCharting search/category link
        if (!urlObj.hostname.includes('pricecharting.com')) {
            urlObj.search = '';
            urlObj.hash = '';
            let results = urlObj.toString();
            // Remove trailing slash and dash (common in TCGplayer links)
            results = results.replace(/[-\/]+$/, '');
            return results;
        }

    } catch (e) {
        // Fallback for invalid URLs or those without protocol
    }

    // Default: strip query params if it looks like a direct link we're tracking
    return url.split('?')[0].replace(/[-\/]+$/, '');
}
