import crypto from 'node:crypto';
export function hashSessionToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export async function resolveSessionContext(prisma, sessionToken) {
    const session = await prisma.session.findUnique({
        where: {
            sessionTokenHash: hashSessionToken(sessionToken),
        },
        include: {
            user: {
                include: {
                    sellerProfile: true,
                },
            },
        },
    });
    if (!session) {
        throw new Error('SLABHUB_MCP_SESSION_TOKEN does not match any session.');
    }
    if (session.revokedAt) {
        throw new Error('SLABHUB_MCP_SESSION_TOKEN points to a revoked session.');
    }
    if (session.expiresAt < new Date()) {
        throw new Error('SLABHUB_MCP_SESSION_TOKEN points to an expired session.');
    }
    return {
        userId: session.userId,
        sellerId: session.user.sellerProfile?.id ?? null,
        sellerHandle: session.user.sellerProfile?.handle ?? null,
        email: session.user.email,
    };
}
//# sourceMappingURL=auth.js.map