import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

export async function createUser(prisma: PrismaClient, email = 'user@example.com') {
  return prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
    },
  });
}

export async function createSeller(prisma: PrismaClient, userId: string, handle = 'test-seller') {
  return prisma.sellerProfile.create({
    data: {
      userId,
      handle,
      shopName: 'Test Seller',
      isActive: true,
      location: 'Moscow',
      paymentsAccepted: ['Cash'],
      fulfillmentOptions: ['shipping'],
    },
  });
}

export async function createSession(prisma: PrismaClient, userId: string, token = 'session-token') {
  const sessionTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const session = await prisma.session.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { session, token };
}

export async function createInvite(prisma: PrismaClient, inviterUserId: string, tokenHash = 'invite-token') {
  return prisma.invite.create({
    data: {
      inviterUserId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 99,
    },
  });
}

export async function createWorkflowStatuses(prisma: PrismaClient, userId: string) {
  const defs = [
    { name: 'Acquired', position: 0, systemId: 'ACQUIRED', color: '#94a3b8' },
    { name: 'Listed', position: 1, systemId: 'LISTED', color: '#3b82f6' },
    { name: 'Sold', position: 2, systemId: 'SOLD', color: '#ef4444' },
  ];

  const results = [];
  for (const d of defs) {
    results.push(
      await prisma.workflowStatus.create({
        data: {
          ...d,
          userId,
        },
      }),
    );
  }

  return results;
}
