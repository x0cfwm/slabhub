import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Response } from 'express';
import { CookieUtils } from '../auth/utils/cookies';

@Injectable()
export class OauthFacebookService {
    private readonly logger = new Logger(OauthFacebookService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
        private readonly httpService: HttpService,
    ) { }

    getLoginUrl(inviteToken?: string): string {
        const clientId = this.configService.get<string>('FACEBOOK_APP_ID');
        const apiUrl = this.getApiUrl();
        const redirectUri = `${apiUrl}/v1/auth/facebook/callback`;

        if (!clientId) {
            throw new BadRequestException('Facebook OAuth is not configured');
        }

        const statePayload: any = {};
        if (inviteToken) {
            statePayload.inviteToken = inviteToken;
        }
        const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'email,public_profile,user_link',
            response_type: 'code',
            state,
        });

        return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }

    async handleCallback(code: string, res: Response, state?: string, existingSessionToken?: string, userAgent?: string, ip?: string) {
        const clientId = this.configService.get<string>('FACEBOOK_APP_ID');
        const clientSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
        const apiUrl = this.getApiUrl();
        const redirectUri = `${apiUrl}/v1/auth/facebook/callback`;
        const webOrigin = this.configService.get<string>('WEB_ORIGIN') || apiUrl.replace(/\/api$/, '');

        let inviteToken: string | undefined;
        if (state) {
            try {
                const statePayload = JSON.parse(Buffer.from(state, 'base64').toString());
                inviteToken = statePayload.inviteToken;
            } catch (e) {
                // Ignore invalid state
            }
        }

        if (!clientId || !clientSecret) {
            this.logger.error('Facebook OAuth missing configuration', { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
            const origin = webOrigin || apiUrl;
            return res.redirect(`${origin}/login?error=facebook_not_configured`);
        }

        try {
            // 1. Exchange code for access token
            const tokenResponse = await lastValueFrom(
                this.httpService.get('https://graph.facebook.com/v19.0/oauth/access_token', {
                    params: {
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                        code,
                    },
                })
            ).catch(e => {
                this.logger.error('Failed to get FB token', e.response?.data);
                throw e;
            });

            const { access_token } = tokenResponse.data;

            // 2. Get user profile
            const profileResponse = await lastValueFrom(
                this.httpService.get('https://graph.facebook.com/me', {
                    params: {
                        fields: 'id,name,email,picture,link',
                        access_token,
                    },
                })
            ).catch(e => {
                this.logger.error('Failed to get FB profile', e.response?.data);
                throw e;
            });

            const profile = profileResponse.data;
            this.logger.debug('Facebook profile retrieved', { id: profile.id, hasEmail: !!profile.email, hasLink: !!profile.link });
            
            const email = profile.email?.toLowerCase().trim();
            const providerUserId = profile.id;
            const profileUrl = profile.link || `https://www.facebook.com/${providerUserId}`;

            // Check if user is currently logged in (for linking)
            let currentUser = null;
            if (existingSessionToken) {
                currentUser = await this.authService.validateSession(existingSessionToken);
            }

            let user = null;

            // 3. Find Identity
            const existingIdentity = await this.prisma.oAuthIdentity.findUnique({
                where: { provider_providerUserId: { provider: 'facebook', providerUserId } },
                include: { user: true },
            });

            if (currentUser) {
                // LINKING FLOW
                if (existingIdentity && existingIdentity.userId !== currentUser.id) {
                    // Identity belongs to someone else
                    return res.redirect(`${webOrigin}/settings?error=facebook_already_linked_other_account`);
                }

                if (existingIdentity) {
                    await this.prisma.oAuthIdentity.update({
                        where: { id: existingIdentity.id },
                        data: { email, profileUrl, profileData: profile },
                    });
                } else {
                    await this.prisma.oAuthIdentity.create({
                        data: {
                            provider: 'facebook',
                            providerUserId,
                            userId: currentUser.id,
                            email,
                            profileUrl,
                            profileData: profile,
                        },
                    });
                }

                await this.prisma.user.update({
                    where: { id: currentUser.id },
                    data: { facebookVerifiedAt: new Date() },
                });

                return res.redirect(`${webOrigin}/settings?success=facebook_linked`);

            } else {
                // LOGIN / SIGNUP FLOW
                if (existingIdentity) {
                    user = existingIdentity.user;
                    await this.prisma.oAuthIdentity.update({
                        where: { id: existingIdentity.id },
                        data: { email, profileUrl, profileData: profile },
                    });
                } else if (email) {
                    const existingUser = await this.prisma.user.findUnique({
                        where: { email },
                    });

                    if (existingUser) {
                        // Link by email
                        user = existingUser;
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: {
                                emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
                                facebookVerifiedAt: new Date()
                            },
                        });
                        await this.prisma.oAuthIdentity.create({
                            data: {
                                provider: 'facebook',
                                providerUserId,
                                userId: user.id,
                                email,
                                profileUrl,
                                profileData: profile,
                            },
                        });
                    } else {
                        // Create new user (Respect INVITE_ONLY_REGISTRATION)
                        const isInviteOnly = this.configService.get<boolean>('INVITE_ONLY_REGISTRATION');
                        let invite = null;

                        if (isInviteOnly) {
                            if (!inviteToken) {
                                return res.redirect(`${webOrigin}/login?error=invitation_required`);
                            }

                            // Validate invite
                            invite = await this.prisma.invite.findUnique({
                                where: { tokenHash: inviteToken, revokedAt: null },
                            });

                            if (!invite || invite.expiresAt < new Date()) {
                                return res.redirect(`${webOrigin}/login?error=invite_invalid_or_expired`);
                            }
                        } else if (inviteToken) {
                            // If not invite only, but token provided, try to find it to record acceptance
                            invite = await this.prisma.invite.findUnique({
                                where: { tokenHash: inviteToken, revokedAt: null },
                            });
                        }

                        user = await this.prisma.user.create({
                            data: {
                                email,
                                emailVerifiedAt: new Date(),
                                facebookVerifiedAt: new Date(),
                            }
                        });

                        await this.prisma.oAuthIdentity.create({
                            data: {
                                provider: 'facebook',
                                providerUserId,
                                userId: user.id,
                                email,
                                profileUrl,
                                profileData: profile,
                            }
                        });

                        // Record acceptance if invite found
                        if (invite) {
                            await this.prisma.inviteAcceptance.create({
                                data: {
                                    inviteId: invite.id,
                                    invitedUserId: user.id,
                                    invitedEmailMasked: this.maskEmail(email),
                                }
                            });

                            await this.prisma.invite.update({
                                where: { id: invite.id },
                                data: { usedCount: { increment: 1 } }
                            });
                        }
                    }
                } else {
                    return res.redirect(`${webOrigin}/login?error=facebook_email_required`);
                }

                // Create Session
                const sessionToken = await this.authService.createSession(user.id, userAgent, ip);
                CookieUtils.setSessionCookie(res, sessionToken);

                return res.redirect(`${webOrigin}/dashboard`);
            }
        } catch (error: any) {
            this.logger.error('Facebook OAuth error', { 
                message: error.message, 
                response: error.response?.data,
                stack: error.stack 
            });
            const origin = webOrigin || apiUrl;
            const redirectUrl = existingSessionToken ? `${origin}/settings?error=facebook_error` : `${origin}/login?error=facebook_error`;
            return res.redirect(redirectUrl);
        }
    }

    async disconnect(userId: string) {
        // Delete identity
        await this.prisma.oAuthIdentity.deleteMany({
            where: {
                userId,
                provider: 'facebook'
            }
        });

        // Update user
        await this.prisma.user.update({
            where: { id: userId },
            data: { facebookVerifiedAt: null }
        });

        return { ok: true };
    }

    private getApiUrl(): string {
        return this.configService.get<string>('NEXT_PUBLIC_API_URL') || `http://localhost:${this.configService.get<string>('PORT') || 3001}`;
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split("@");
        if (!local || !domain) return email;
        if (local.length <= 1) return `${local}***@${domain}`;
        return `${local[0]}***@${domain}`;
    }
}
