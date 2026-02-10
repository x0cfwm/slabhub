import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export interface AuthenticatedRequest extends Request {
    userId?: string;
    sellerId?: string;
    sellerHandle?: string;
}
export declare class AuthMiddleware implements NestMiddleware {
    private readonly prisma;
    constructor(prisma: PrismaService);
    use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const CurrentSellerId: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const CurrentSellerHandle: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const CurrentUserId: (...dataOrPipes: unknown[]) => ParameterDecorator;
