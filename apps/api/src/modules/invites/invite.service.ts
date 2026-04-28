import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class InviteService {
    constructor(private readonly prisma: PrismaService) { }

    async getOrCreateMyInvite(userId: string) {
        let invite = await this.prisma.invite.findFirst({
            where: { inviterUserId: userId, revokedAt: null },
        });

        if (!invite) {
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            invite = await this.prisma.invite.create({
                data: {
                    inviterUserId: userId,
                    tokenHash,
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                    maxUses: 999999, // "multiple times"
                },
            });

            // Return token only once (or we can just use the hash for the link if we want, but usually we link with token)
            // The requirement says "ONE referral link (copyable)", "can be used multiple times".
            // If we store hash, we need to pass the token. 
            // Let's store token itself or use it as ID if we want it to be unique and copyable.
            // Actually, the model says tokenHash. So I'll use the token as the string in the URL.
            return {
                ...invite,
                token
            };
        }

        // If invite already exists, we don't have the original token unless we store it or use a stable derivation.
        // For a single permanent link, maybe we can store the token itself in `tokenHash` if it's not a security risk, 
        // or just use a stable token.
        // Let's use a stable token based on userId for "one referral link".
        const stableToken = crypto.createHash('sha256').update(userId + "slabhub-salt-v1").digest('hex');

        // Re-check if this stable token exists (even if revoked)
        const existing = await this.prisma.invite.findUnique({
            where: { tokenHash: stableToken }
        });

        if (existing) {
            // If it was revoked, un-revoke it to make it active again
            if (existing.revokedAt) {
                await this.prisma.invite.update({
                    where: { id: existing.id },
                    data: { revokedAt: null }
                });
            }
            return { ...existing, token: stableToken, revokedAt: null };
        }

        return await this.prisma.invite.create({
            data: {
                inviterUserId: userId,
                tokenHash: stableToken,
                expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // effectively forever
                maxUses: 999999,
            },
        }).then(inv => ({ ...inv, token: stableToken }));
    }

    async getAcceptedInvites(userId: string) {
        return this.prisma.inviteAcceptance.findMany({
            where: { invite: { inviterUserId: userId } },
            orderBy: { acceptedAt: 'desc' },
            select: {
                acceptedAt: true,
                invitedEmailMasked: true,
            }
        });
    }

    async getInvitePreview(token: string) {
        const invite = await this.prisma.invite.findUnique({
            where: { tokenHash: token, revokedAt: null },
            include: { inviter: true },
        });

        if (!invite || invite.expiresAt < new Date()) {
            throw new NotFoundException('Invite invalid or expired');
        }

        return {
            inviterEmailMasked: this.maskEmail(invite.inviter.email),
        };
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split("@");
        if (!local || !domain) {return email;}
        if (local.length <= 1) {return `${local}***@${domain}`;}
        return `${local[0]}***@${domain}`;
    }
}
