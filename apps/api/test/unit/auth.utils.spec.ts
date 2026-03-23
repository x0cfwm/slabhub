import { OtpUtils } from '../../src/modules/auth/utils/otp';
import { makeRes } from '../helpers/http';

describe('Auth utils', () => {
  describe('OtpUtils', () => {
    it('generates 6-digit OTP by default', () => {
      const otp = OtpUtils.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('hashes and compares OTP correctly', () => {
      process.env.OTP_SECRET = 'otp-test';
      const salt = OtpUtils.generateSalt();
      const hash = OtpUtils.hashOtp('123456', salt);

      expect(OtpUtils.compareOtp('123456', salt, hash)).toBe(true);
      expect(OtpUtils.compareOtp('000000', salt, hash)).toBe(false);
    });
  });

  describe('CookieUtils', () => {
    it('sets cookie with lax in non-production', async () => {
      jest.resetModules();
      process.env.NODE_ENV = 'test';
      process.env.SESSION_COOKIE_NAME = 'slabhub_session';
      process.env.SESSION_TTL_DAYS = '10';
      const { CookieUtils } = await import('../../src/modules/auth/utils/cookies');

      const res = makeRes();
      CookieUtils.setSessionCookie(res, 'token-1');

      expect(res.cookie).toHaveBeenCalledWith(
        'slabhub_session',
        'token-1',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('clears cookie', async () => {
      jest.resetModules();
      process.env.SESSION_COOKIE_NAME = 'slabhub_session';
      const { CookieUtils } = await import('../../src/modules/auth/utils/cookies');

      const res = makeRes();
      CookieUtils.clearSessionCookie(res);
      expect(res.clearCookie).toHaveBeenCalledWith('slabhub_session', { path: '/' });
    });
  });
});
