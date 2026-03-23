import { WaitlistService } from '../../src/modules/waitlist/waitlist.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('WaitlistService', () => {
  it('returns alreadyExists if email exists', async () => {
    const prisma = createPrismaMock();
    prisma.waitlistParticipant.findUnique.mockResolvedValue({ id: 'w1' });

    const service = new WaitlistService(prisma, { sendWaitlistConfirmation: jest.fn() } as any);
    await expect(service.join('a@b.com')).resolves.toEqual({ success: true, alreadyExists: true });
  });

  it('creates participant and swallows confirmation email failures', async () => {
    const prisma = createPrismaMock();
    prisma.waitlistParticipant.findUnique.mockResolvedValue(null);
    prisma.waitlistParticipant.create.mockResolvedValue({ id: 'w2' });

    const service = new WaitlistService(prisma, {
      sendWaitlistConfirmation: jest.fn().mockRejectedValue(new Error('mail failed')),
    } as any);

    await expect(service.join('a@b.com', 'A')).resolves.toEqual({ success: true });
  });
});
