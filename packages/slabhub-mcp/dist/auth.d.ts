import { PrismaClient } from '@prisma/client';
export interface AuthContext {
    userId: string;
    sellerId: string | null;
    sellerHandle: string | null;
    email: string;
}
export declare function hashSessionToken(token: string): string;
export declare function resolveSessionContext(prisma: PrismaClient, sessionToken: string): Promise<AuthContext>;
