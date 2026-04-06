function stripTrailingSlash(value) {
    return value.replace(/\/$/, '');
}
export function buildMediaUrl(media, env) {
    if (!media) {
        return null;
    }
    if (env.S3_CDN_BASE_URL) {
        return `${stripTrailingSlash(env.S3_CDN_BASE_URL)}/${media.key}`;
    }
    if (env.S3_PUBLIC_BASE_URL) {
        return `${stripTrailingSlash(env.S3_PUBLIC_BASE_URL)}/${media.key}`;
    }
    if (!env.S3_ENDPOINT || !env.S3_BUCKET) {
        return null;
    }
    if (env.S3_FORCE_PATH_STYLE) {
        return `${stripTrailingSlash(env.S3_ENDPOINT)}/${env.S3_BUCKET}/${media.key}`;
    }
    const endpoint = new URL(env.S3_ENDPOINT);
    return `${endpoint.protocol}//${env.S3_BUCKET}.${endpoint.host}/${media.key}`;
}
export function ensureCdnUrl(url, env) {
    if (!url) {
        return null;
    }
    if (!env.S3_CDN_BASE_URL || !env.S3_PUBLIC_BASE_URL) {
        return url;
    }
    const publicBase = stripTrailingSlash(env.S3_PUBLIC_BASE_URL);
    const cdnBase = stripTrailingSlash(env.S3_CDN_BASE_URL);
    if (url.startsWith(publicBase)) {
        return url.replace(publicBase, cdnBase);
    }
    return url;
}
//# sourceMappingURL=media.js.map