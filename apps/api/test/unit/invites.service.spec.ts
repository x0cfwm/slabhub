import { NotFoundException } from '@nestjs/common';
import { InviteService } from '../../src/modules/invites/invite.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('InviteService', () => {
  it('creates invite when user has none', async () => {
    const prisma = createPrismaMock();
    prisma.invite.findFirst.mockResolvedValue(null);
    prisma.invite.create.mockResolvedValue({ id: 'i1', tokenHash: 'h', revokedAt: null });

    const service = new InviteService(prisma);
    const out = await service.getOrCreateMyInvite('u1');

    expect(out.id).toBe('i1');
    expect(out.token).toBeDefined();
  });

  it('throws for invalid preview token', async () => {
    const prisma = createPrismaMock();
    prisma.invite.findUnique.mockResolvedValue(null);

    const service = new InviteService(prisma);
    await expect(service.getInvitePreview('bad')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns masked inviter email in preview', async () => {
    const prisma = createPrismaMock();
    prisma.invite.findUnique.mockResolvedValue({
      inviter: { email: 'seller@example.com' },
      expiresAt: new Date(Date.now() + 10000),
    });

    const service = new InviteService(prisma);
    const out = await service.getInvitePreview('token');
    expect(out.inviterEmailMasked).toBe('s***@example.com');
  });
});
