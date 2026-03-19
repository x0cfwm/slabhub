import { MailerConsoleService } from '../../src/modules/auth/mail/mailer.service';

describe('MailerConsoleService', () => {
  it('logs OTP and waitlist emails', async () => {
    const service = new MailerConsoleService();
    const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    await service.sendOtp('a@b.com', '123456');
    await service.sendWaitlistConfirmation('a@b.com');

    expect(logSpy).toHaveBeenCalled();
  });
});
