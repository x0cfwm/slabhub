import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from '../../src/modules/auth/guards/session.guard';

describe('SessionGuard', () => {
  const createContext = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it('throws when token is missing', async () => {
    const authService = { validateSession: jest.fn() } as any;
    const guard = new SessionGuard(authService);

    await expect(guard.canActivate(createContext({ headers: {}, cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('extracts bearer token and attaches user', async () => {
    const user = { id: 'u1' };
    const authService = { validateSession: jest.fn().mockResolvedValue(user) } as any;
    const guard = new SessionGuard(authService);

    const req = { headers: { authorization: 'Bearer t1' }, cookies: {} } as any;
    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);

    expect(authService.validateSession).toHaveBeenCalledWith('t1');
    expect(req.user).toEqual(user);
  });

  it('throws when session is invalid', async () => {
    const authService = { validateSession: jest.fn().mockResolvedValue(null) } as any;
    const guard = new SessionGuard(authService);

    await expect(
      guard.canActivate(createContext({ headers: {}, cookies: { slabhub_session: 'x' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
