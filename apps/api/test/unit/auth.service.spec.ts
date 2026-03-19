import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service';
import { OtpUtils } from '../../src/modules/auth/utils/otp';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('AuthService', () => {
  let prisma: any;
  let mailer: any;
  let configService: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    mailer = { sendOtp: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(false) };
    service = new AuthService(prisma, mailer, configService);
  });

  describe('requestOtp', () => {
    it('creates OTP challenge and sends mail for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.otpChallenge.create.mockResolvedValue({ id: 'c1' });
      jest.spyOn(OtpUtils, 'generateOtp').mockReturnValue('123456');
      jest.spyOn(OtpUtils, 'generateSalt').mockReturnValue('salt');
      jest.spyOn(OtpUtils, 'hashOtp').mockReturnValue('hash');

      const result = await service.requestOtp('A@B.COM ');

      expect(result).toEqual({ ok: true });
      expect(prisma.otpChallenge.create).toHaveBeenCalled();
      expect(mailer.sendOtp).toHaveBeenCalledWith('a@b.com', '123456');
    });

    it('requires invite for new users when invite-only enabled', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      configService.get.mockReturnValue(true);

      await expect(service.requestOtp('new@user.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid invite token when invite-only enabled', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      configService.get.mockReturnValue(true);
      prisma.invite.findUnique.mockResolvedValue(null);

      await expect(service.requestOtp('new@user.com', 'bad-token')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('throws for missing challenge when not using magic code', async () => {
      process.env.NODE_ENV = 'test';
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp('x@y.com', '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when attempts exceeded', async () => {
      process.env.NODE_ENV = 'test';
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'c1',
        attempts: 5,
        salt: 's',
        codeHash: 'h',
      });

      await expect(service.verifyOtp('x@y.com', '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws unauthorized for invalid otp', async () => {
      process.env.NODE_ENV = 'test';
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'c1',
        attempts: 0,
        salt: 's',
        codeHash: 'h',
      });
      prisma.otpChallenge.update.mockResolvedValue({});
      jest.spyOn(OtpUtils, 'compareOtp').mockReturnValue(false);

      await expect(service.verifyOtp('x@y.com', '111111')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses magic code in local mode and creates session', async () => {
      process.env.NODE_ENV = 'local';
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'x@y.com' });
      prisma.session.create.mockResolvedValue({});

      const out = await service.verifyOtp('x@y.com', '000000', 'ua', '1.1.1.1');

      expect(out.user.id).toBe('u1');
      expect(typeof out.sessionToken).toBe('string');
    });

    it('records invite acceptance for new invited user', async () => {
      process.env.NODE_ENV = 'test';
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'c1',
        attempts: 0,
        salt: 'salt',
        codeHash: 'hash',
      });
      prisma.otpChallenge.update.mockResolvedValue({});
      jest.spyOn(OtpUtils, 'compareOtp').mockReturnValue(true);

      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.upsert.mockResolvedValue({ id: 'u2', email: 'new@user.com' });
      prisma.invite.findUnique.mockResolvedValue({ id: 'inv1', inviter: { email: 'a@b.com' } });
      prisma.inviteAcceptance.create.mockResolvedValue({});
      prisma.invite.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      await service.verifyOtp('new@user.com', '123456', 'ua', '2.2.2.2', 'invite-token');

      expect(prisma.inviteAcceptance.create).toHaveBeenCalled();
      expect(prisma.invite.update).toHaveBeenCalled();
    });
  });

  describe('session methods', () => {
    it('validateSession returns null for revoked session', async () => {
      prisma.session.findUnique.mockResolvedValue({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 10000) });
      await expect(service.validateSession('tok')).resolves.toBeNull();
    });

    it('validateSession returns user for active session', async () => {
      const user = { id: 'u1' };
      prisma.session.findUnique.mockResolvedValue({ revokedAt: null, expiresAt: new Date(Date.now() + 10000), user });
      await expect(service.validateSession('tok')).resolves.toEqual(user);
    });

    it('logout revokes matching sessions', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });
      await expect(service.logout('tok')).resolves.toEqual({ ok: true });
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });
  });
});
