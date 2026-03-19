import { InviteController } from '../../src/modules/invites/invite.controller';

describe('InviteController', () => {
  it('delegates invite routes', async () => {
    const service = {
      getOrCreateMyInvite: jest.fn().mockResolvedValue({ id: '1' }),
      getAcceptedInvites: jest.fn().mockResolvedValue([]),
      getInvitePreview: jest.fn().mockResolvedValue({ inviterEmailMasked: 'x***@y.com' }),
    };

    const controller = new InviteController(service as any);

    await expect(controller.getMyInvite({ user: { id: 'u1' } })).resolves.toEqual({ id: '1' });
    await expect(controller.getAcceptedInvites({ user: { id: 'u1' } })).resolves.toEqual([]);
    await expect(controller.getInvitePreview('t')).resolves.toEqual({ inviterEmailMasked: 'x***@y.com' });
  });
});
