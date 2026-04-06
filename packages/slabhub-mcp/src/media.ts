import type { Media } from '@prisma/client';
import type { SlabhubMcpEnv } from './env.js';

type MediaLike = Pick<Media, 'key'> | { key: string };

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export function buildMediaUrl(
  media: MediaLike | null | undefined,
  env: SlabhubMcpEnv,
): string | null {
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

export function ensureCdnUrl(
  url: string | null | undefined,
  env: SlabhubMcpEnv,
): string | null {
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
