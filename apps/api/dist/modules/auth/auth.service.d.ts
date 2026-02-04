import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from './mail/mailer.service';
export declare class AuthService {
    private readonly prisma;
    private readonly mailer;
    private readonly logger;
    private readonly OTP_TTL_MINUTES;
    private readonly MAX_OTP_ATTEMPTS;
    constructor(prisma: PrismaService, mailer: MailerService);
    requestOtp(email: string): Promise<{
        ok: boolean;
    }>;
    verifyOtp(email: string, otp: string, userAgent?: string, ip?: string): Promise<{
        sessionToken: string;
        user: {
            id: string;
            email: string;
        };
    }>;
    validateSession(token: string): Promise<({
        sellerProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            handle: string;
            shopName: string;
            isActive: boolean;
            locationCountry: string;
            locationCity: string;
            paymentsAccepted: string[];
            meetupsEnabled: boolean;
            shippingEnabled: boolean;
            socials: import("@prisma/client/runtime/library").JsonValue;
            wishlistText: string;
        } | null;
    } & {
        id: string;
        email: string;
        emailVerifiedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    logout(token: string): Promise<{
        ok: boolean;
    }>;
}
