import { WaitlistController } from '../../src/modules/waitlist/waitlist.controller';

describe('WaitlistController', () => {
  it('delegates join', async () => {
    const service = { join: jest.fn().mockResolvedValue({ success: true }) };
    const controller = new WaitlistController(service as any);

    await expect(controller.join({ email: 'a@b.com', name: 'A' } as any)).resolves.toEqual({ success: true });
  });
});
