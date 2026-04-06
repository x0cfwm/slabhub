import {
    Injectable,
    NestMiddleware,
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Default demo seller handle for unauthenticated requests
const DEFAULT_SELLER_HANDLE = 'nami-treasures';

export interface AuthenticatedRequest extends Request {
    userId?: string;
    sellerId?: string;
    sellerHandle?: string;
    impersonatorId?: string;
}

import { AuthService } from './auth.service';
import * as crypto from 'crypto';

/**
 * Minimal auth middleware for Stage 1.
 * Extracts seller info from sessions, headers or defaults to demo seller.
 * Structure is ready for future JWT/OAuth integration.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        const handleFromHeader = req.headers['x-user-handle'] as string | undefined;
        const idFromHeader = req.headers['x-user-id'] as string | undefined;
        const authHeader = req.headers['authorization'];
        let sessionToken = req.cookies[process.env.SESSION_COOKIE_NAME || 'slabhub_session'];

        // If no cookie, check Authorization: Bearer token
        if (!sessionToken && authHeader?.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7);
        }

        let seller = null;
        let authenticatedUser = null;

        // 1. Try session first
        if (sessionToken) {
            const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
            const session = await this.prisma.session.findUnique({
                where: { sessionTokenHash },
                include: { user: { include: { sellerProfile: true } } },
            });

            if (session && !session.revokedAt && session.expiresAt > new Date()) {
                authenticatedUser = session.user;
                seller = session.user.sellerProfile;
                req.userId = session.userId;
            }
        }

        // 2. Try headers (legacy/dev)
        if (!seller) {
            if (idFromHeader) {
                seller = await this.prisma.sellerProfile.findUnique({
                    where: { id: idFromHeader },
                });
            } else if (handleFromHeader) {
                seller = await this.prisma.sellerProfile.findUnique({
                    where: { handle: handleFromHeader },
                });
            }
        }

        if (seller) {
            req.sellerId = seller.id;
            req.sellerHandle = seller.handle;
            if (!req.userId && seller.userId) {
                req.userId = seller.userId;
            }
        }

        // 3. Impersonation Logic
        // If the authenticated user is an admin, they can impersonate another user via '?as=userId'
        const impersonateUserId = req.query.as as string;
        if (authenticatedUser?.admin === 1 && impersonateUserId) {
            const targetUser = await this.prisma.user.findUnique({
                where: { id: impersonateUserId },
                include: { sellerProfile: true },
            });

            if (targetUser) {
                req.impersonatorId = req.userId;
                req.userId = targetUser.id;
                req.sellerId = targetUser.sellerProfile?.id;
                req.sellerHandle = targetUser.sellerProfile?.handle;
            }
        }

        next();
    }
}

/**
 * Decorator to extract current seller ID from request
 */
export const CurrentSellerId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        return request.sellerId;
    },
);

/**
 * Decorator to extract current seller handle from request
 */
export const CurrentSellerHandle = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        return request.sellerHandle;
    },
);
/**
 * Decorator to extract current user ID from request
 */
export const CurrentUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        return request.userId;
    },
);
