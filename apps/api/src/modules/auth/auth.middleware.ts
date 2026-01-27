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
    sellerId?: string;
    sellerHandle?: string;
}

/**
 * Minimal auth middleware for Stage 1.
 * Extracts seller info from headers or defaults to demo seller.
 * Structure is ready for future JWT/OAuth integration.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        const handleFromHeader = req.headers['x-user-handle'] as string | undefined;
        const idFromHeader = req.headers['x-user-id'] as string | undefined;

        let seller = null;

        // Try to find seller by ID first, then by handle
        if (idFromHeader) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { id: idFromHeader },
            });
        } else if (handleFromHeader) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { handle: handleFromHeader },
            });
        }

        // Default to demo seller if no auth provided
        if (!seller) {
            seller = await this.prisma.sellerProfile.findUnique({
                where: { handle: DEFAULT_SELLER_HANDLE },
            });
        }

        if (seller) {
            req.sellerId = seller.id;
            req.sellerHandle = seller.handle;
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
