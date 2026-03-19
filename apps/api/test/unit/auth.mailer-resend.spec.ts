jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

import { Resend } from 'resend';
import { ResendMailerService } from '../../src/modules/auth/mail/resend-mailer.service';

describe('ResendMailerService', () => {
  beforeEach(() => {
    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'mail-1' }, error: null }),
      },
    }));
  });

  it('sends OTP and waitlist confirmation', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const service = new ResendMailerService();

    await expect(service.sendOtp('a@b.com', '123456')).resolves.toBeUndefined();
    await expect(service.sendWaitlistConfirmation('a@b.com')).resolves.toBeUndefined();
  });
});
