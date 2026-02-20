import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OtpUtils } from './utils/otp';
import { MailerService } from './mail/mailer.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
    private readonly MAX_OTP_ATTEMPTS = 5;

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailer: MailerService,
        private readonly configService: ConfigService,
    ) { }

    async requestOtp(email: string, inviteToken?: string) {
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // New user registration attempt
            const isInviteOnly = this.configService.get<boolean>('INVITE_ONLY_REGISTRATION');

            if (isInviteOnly) {
                if (!inviteToken) {
                    throw new BadRequestException('Invitation required for new accounts');
                }

                // Validate invite
                const invite = await this.prisma.invite.findUnique({
                    where: { tokenHash: inviteToken, revokedAt: null },
                });

                if (!invite || invite.expiresAt < new Date()) {
                    throw new BadRequestException('Invalid or expired invitation');
                }
            }
        }

        // Generate OTP
        const otp = OtpUtils.generateOtp();
        const salt = OtpUtils.generateSalt();
        const codeHash = OtpUtils.hashOtp(otp, salt);
        const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

        // Store challenge (delete old ones for this email if any)
        await this.prisma.otpChallenge.create({
            data: {
                email: normalizedEmail,
                codeHash,
                salt,
                expiresAt,
            },
        });

        // Send OTP
        await this.mailer.sendOtp(normalizedEmail, otp);

        return { ok: true };
    }

    async verifyOtp(email: string, otp: string, userAgent?: string, ip?: string, inviteToken?: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const isDevMagicCode = process.env.NODE_ENV === 'local' && otp === '000000';

        // Find active challenge
        const challenge = await this.prisma.otpChallenge.findFirst({
            where: {
                email: normalizedEmail,
                consumedAt: null,
                // Only enforce expiration if not using magic code
                ...(!isDevMagicCode ? { expiresAt: { gt: new Date() } } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!challenge && !isDevMagicCode) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        if (challenge) {
            // Check attempts
            if (challenge.attempts >= this.MAX_OTP_ATTEMPTS && !isDevMagicCode) {
                throw new BadRequestException('Too many attempts. Please request a new code.');
            }

            // Increment attempts
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: {
                    attempts: { increment: 1 },
                    lastAttemptAt: new Date(),
                },
            });
        }

        // Compare OTP
        const isValid = isDevMagicCode || (challenge && OtpUtils.compareOtp(otp, challenge.salt!, challenge.codeHash));

        if (!isValid) {
            throw new UnauthorizedException('Invalid code');
        }

        if (challenge) {
            // Consume challenge
            await this.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { consumedAt: new Date() },
            });
        }

        // Check if user exists before upsert to know if it's a new signup
        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // Upsert user
        const user = await this.prisma.user.upsert({
            where: { email: normalizedEmail },
            create: {
                email: normalizedEmail,
                emailVerifiedAt: new Date(),
            },
            update: {
                emailVerifiedAt: new Date(), // Always update if verified via OTP
            },
        });

        // If new user and inviteToken provided, record acceptance
        if (!existingUser && inviteToken) {
            const invite = await this.prisma.invite.findUnique({
                where: { tokenHash: inviteToken },
                include: { inviter: true }
            });

            if (invite) {
                await this.prisma.inviteAcceptance.create({
                    data: {
                        inviteId: invite.id,
                        invitedUserId: user.id,
                        invitedEmailMasked: this.maskEmail(normalizedEmail),
                    }
                });

                await this.prisma.invite.update({
                    where: { id: invite.id },
                    data: { usedCount: { increment: 1 } }
                });
            }
        }

        // Create session
        const sessionToken = await this.createSession(user.id, userAgent, ip);

        return {
            sessionToken,
            user: {
                id: user.id,
                email: user.email
            }
        };
    }

    async validateSession(token: string) {
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

    async createSession(userId: string, userAgent?: string, ip?: string) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await this.prisma.session.create({
            data: {
                userId,
                sessionTokenHash,
                expiresAt: sessionExpiresAt,
                userAgent,
                ip,
            },
        });

        return sessionToken;
    }

    async logout(token: string) {
        const sessionTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await this.prisma.session.updateMany({
            where: { sessionTokenHash },
            data: { revokedAt: new Date() },
        });

        return { ok: true };
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split("@");
        if (!local || !domain) return email;
        if (local.length <= 1) return `${local}***@${domain}`;
        return `${local[0]}***@${domain}`;
    }
}
