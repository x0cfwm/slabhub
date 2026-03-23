import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { OauthFacebookService } from '../../src/modules/oauth-facebook/oauth-facebook.service';
import { makeRes } from '../helpers/http';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('OauthFacebookService', () => {
  let configService: any;
  let prisma: any;
  let authService: any;
  let httpService: any;
  let service: OauthFacebookService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          FACEBOOK_APP_ID: 'fb-id',
          FACEBOOK_APP_SECRET: 'fb-secret',
          NEXT_PUBLIC_API_URL: 'http://localhost:3001',
          WEB_ORIGIN: 'http://localhost:3000',
          INVITE_ONLY_REGISTRATION: false,
        };
        return values[key];
      }),
    };
    prisma = createPrismaMock();
    authService = {
      validateSession: jest.fn().mockResolvedValue(null),
      createSession: jest.fn().mockResolvedValue('session-token'),
    };
    httpService = { get: jest.fn() };

    service = new OauthFacebookService(configService, prisma, authService, httpService);
  });

  it('builds login URL with optional invite state', () => {
    const url = service.getLoginUrl('invite-token');
    expect(url).toContain('facebook.com');
    expect(url).toContain('state=');
  });

  it('throws if app id is missing', () => {
    configService.get = jest.fn(() => undefined);
    service = new OauthFacebookService(configService, prisma, authService, httpService);

    expect(() => service.getLoginUrl()).toThrow(BadRequestException);
  });

  it('redirects with error when oauth config missing in callback', async () => {
    configService.get = jest.fn((key: string) => {
      if (key === 'WEB_ORIGIN') return 'http://localhost:3000';
      if (key === 'NEXT_PUBLIC_API_URL') return 'http://localhost:3001';
      return undefined;
    });
    service = new OauthFacebookService(configService, prisma, authService, httpService);

    const res = makeRes();
    await service.handleCallback('code', res as any);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/login?error=facebook_not_configured');
  });

  it('disconnect removes facebook identity', async () => {
    prisma.oAuthIdentity.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    await expect(service.disconnect('u1')).resolves.toEqual({ ok: true });
    expect(prisma.oAuthIdentity.deleteMany).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('redirects to oauth error when token exchange fails', async () => {
    const res = makeRes();
    httpService.get.mockReturnValueOnce(throwError(() => ({ response: { data: {} } }))); // token exchange

    await service.handleCallback('code', res as any);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/login?error=facebook_error');
  });
});
