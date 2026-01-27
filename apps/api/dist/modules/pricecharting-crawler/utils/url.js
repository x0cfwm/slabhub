"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSlug = extractSlug;
exports.canonicalizeUrl = canonicalizeUrl;
function extractSlug(url, prefix) {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('/').filter(Boolean);
        const index = parts.indexOf(prefix);
        if (index !== -1 && parts[index + 1]) {
            return parts[index + 1];
        }
    }
    catch (e) {
        if (url.includes(`/${prefix}/`)) {
            const parts = url.split(`/${prefix}/`)[1].split('/');
            return parts[0].split('?')[0];
        }
    }
    return undefined;
}
function canonicalizeUrl(url, baseUrl = 'https://www.pricecharting.com') {
    if (url.startsWith('http'))
        return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`.split('?')[0];
}
//# sourceMappingURL=url.js.map