import type { Media } from '@prisma/client';
import type { SlabhubMcpEnv } from './env.js';
type MediaLike = Pick<Media, 'key'> | {
    key: string;
};
export declare function buildMediaUrl(media: MediaLike | null | undefined, env: SlabhubMcpEnv): string | null;
export declare function ensureCdnUrl(url: string | null | undefined, env: SlabhubMcpEnv): string | null;
export {};
