import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    SLABHUB_MCP_SESSION_TOKEN: z.ZodString;
    S3_ENDPOINT: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    S3_BUCKET: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    S3_PUBLIC_BASE_URL: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    S3_CDN_BASE_URL: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    S3_FORCE_PATH_STYLE: z.ZodEffects<z.ZodDefault<z.ZodString>, boolean, string | undefined>;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    SLABHUB_MCP_SESSION_TOKEN: string;
    S3_FORCE_PATH_STYLE: boolean;
    S3_ENDPOINT?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
    S3_CDN_BASE_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    SLABHUB_MCP_SESSION_TOKEN: string;
    S3_ENDPOINT?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
    S3_CDN_BASE_URL?: string | undefined;
    S3_FORCE_PATH_STYLE?: string | undefined;
}>;
export type SlabhubMcpEnv = z.infer<typeof envSchema>;
export declare function loadEnv(rawEnv?: NodeJS.ProcessEnv): SlabhubMcpEnv;
export {};
