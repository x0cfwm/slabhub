import { z } from 'zod';
const optionalUrl = z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined));
const optionalString = z
    .union([z.string().min(1), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined));
const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    SLABHUB_MCP_SESSION_TOKEN: z.string().min(1),
    S3_ENDPOINT: optionalUrl,
    S3_BUCKET: optionalString,
    S3_PUBLIC_BASE_URL: optionalUrl,
    S3_CDN_BASE_URL: optionalUrl,
    S3_FORCE_PATH_STYLE: z
        .string()
        .default('false')
        .transform((value) => value === 'true'),
});
export function loadEnv(rawEnv = process.env) {
    return envSchema.parse(rawEnv);
}
//# sourceMappingURL=env.js.map