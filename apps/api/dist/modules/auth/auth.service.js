"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const otp_1 = require("./utils/otp");
const mailer_service_1 = require("./mail/mailer.service");
const crypto = __importStar(require("crypto"));
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, mailer) {
        this.prisma = prisma;
        this.mailer = mailer;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
        this.MAX_OTP_ATTEMPTS = 5;
    }
    async requestOtp(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const otp = otp_1.OtpUtils.generateOtp();
        const salt = otp_1.OtpUtils.generateSalt();
        const codeHash = otp_1.OtpUtils.hashOtp(otp, salt);
        const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);
        await this.prisma.otpChallenge.create({
            data: {
                email: normalizedEmail,
                codeHash,
                salt,
                expiresAt,
            },
        });
        await this.mailer.sendOtp(normalizedEmail, otp);
        return { ok: true };
    }
    async verifyOtp(email, otp, userAgent, ip) {
        const normalizedEmail = email.toLowerCase().trim();
        const isDevMagicCode = process.env.NODE_ENV !== 'production' && otp === '000000';
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: {
                email: normalizedEmail,
                consumedAt: null,
                ...(!isDevMagicCode ? { expiresAt: { gt: new Date() } } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!challenge && !isDevMagicCode) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        if (challenge) {
            if (challenge.attempts >= this.MAX_OTP_ATTEMPTS && !isDevMagicCode) {
                throw new common_1.BadRequestException('Too many attempts. Please request a new code.');
            }
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: {
                    attempts: { increment: 1 },
                    lastAttemptAt: new Date(),
                },
            });
        }
        const isValid = isDevMagicCode || (challenge && otp_1.OtpUtils.compareOtp(otp, challenge.salt, challenge.codeHash));
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid code');
        }
        if (challenge) {
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { consumedAt: new Date() },
            });
        }
        const user = await this.prisma.user.upsert({
            where: { email: normalizedEmail },
            create: {
                email: normalizedEmail,
                emailVerifiedAt: new Date(),
            },
            update: {
                emailVerifiedAt: new Date(),
            },
        });
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.prisma.session.create({
            data: {
                userId: user.id,
                sessionTokenHash,
                expiresAt: sessionExpiresAt,
                userAgent,
                ip,
            },
        });
        return {
            sessionToken,
            user: {
                id: user.id,
                email: user.email
            }
        };
    }
    async validateSession(token) {
        const sessionTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await this.prisma.session.findUnique({
            where: { sessionTokenHash },
            include: { user: { include: { sellerProfile: true } } },
        });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            return null;
        }
        return session.user;
    }
    async logout(token) {
        const sessionTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await this.prisma.session.updateMany({
            where: { sessionTokenHash },
            data: { revokedAt: new Date() },
        });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mailer_service_1.MailerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map