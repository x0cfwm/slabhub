import { OauthFacebookController } from '../../src/modules/oauth-facebook/oauth-facebook.controller';
import { makeReq, makeRes } from '../helpers/http';

describe('OauthFacebookController', () => {
  it('login redirects to provider url', () => {
    const service = { getLoginUrl: jest.fn().mockReturnValue('https://facebook.test/login') };
    const controller = new OauthFacebookController(service as any);
    const res = makeRes();

    controller.login(res as any, 'invite');

    expect(res.redirect).toHaveBeenCalledWith('https://facebook.test/login');
  });

  it('callback redirects to denied when missing code or error passed', async () => {
    const service = { handleCallback: jest.fn() };
    const controller = new OauthFacebookController(service as any);
    const req = makeReq();
    const res = makeRes();

    process.env.WEB_ORIGIN = 'http://localhost:3000';
    await controller.callback(undefined as any, 'access_denied', undefined as any, req as any, res as any);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/login?error=facebook_oauth_denied');
  });

  it('disconnect delegates to service', async () => {
    const service = { handleCallback: jest.fn(), disconnect: jest.fn().mockResolvedValue({ ok: true }), getLoginUrl: jest.fn() };
    const controller = new OauthFacebookController(service as any);

    await expect(controller.disconnect('u1')).resolves.toEqual({ ok: true });
  });
});
