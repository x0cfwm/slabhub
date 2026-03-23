import { AuthController } from '../../src/modules/auth/auth.controller';
import { CookieUtils } from '../../src/modules/auth/utils/cookies';
import { makeReq, makeRes } from '../helpers/http';

describe('AuthController', () => {
  let authService: any;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(authService);
  });

  it('requestOtp delegates to service', async () => {
    authService.requestOtp.mockResolvedValue({ ok: true });
    await expect(controller.requestOtp({ email: 'u@e.com' } as any)).resolves.toEqual({ ok: true });
  });

  it('verifyOtp sets session cookie and returns payload', async () => {
    const req = makeReq({ headers: { 'user-agent': 'jest' }, ip: '127.0.0.1' });
    const res = makeRes();

    authService.verifyOtp.mockResolvedValue({
      sessionToken: 's-token',
      user: { id: 'u1', email: 'a@b.com' },
    });

    const setCookieSpy = jest.spyOn(CookieUtils, 'setSessionCookie').mockImplementation(() => undefined);

    const out = await controller.verifyOtp({ email: 'a@b.com', otp: '123456' } as any, req as any, res as any);

    expect(setCookieSpy).toHaveBeenCalledWith(res, 's-token');
    expect(out).toEqual({ ok: true, user: { id: 'u1', email: 'a@b.com' }, sessionToken: 's-token' });
  });

  it('logout clears cookie and revokes session token if present', async () => {
    process.env.SESSION_COOKIE_NAME = 'slabhub_session';
    const req = makeReq({ cookies: { slabhub_session: 'tok' } });
    const res = makeRes();

    const clearSpy = jest.spyOn(CookieUtils, 'clearSessionCookie').mockImplementation(() => undefined);

    await expect(controller.logout(req as any, res as any)).resolves.toEqual({ ok: true });
    expect(authService.logout).toHaveBeenCalledWith('tok');
    expect(clearSpy).toHaveBeenCalledWith(res);
  });
});
