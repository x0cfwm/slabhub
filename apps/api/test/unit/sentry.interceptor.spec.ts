import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { SentryInterceptor } from '../../src/common/interceptors/sentry.interceptor';

jest.mock('@sentry/nestjs', () => ({
  withScope: jest.fn(),
  captureException: jest.fn(),
}));

describe('SentryInterceptor', () => {
  beforeEach(() => {
    (Sentry.withScope as jest.Mock).mockImplementation((cb: (scope: { setTag: jest.Mock }) => void) => {
      cb({ setTag: jest.fn() });
    });
  });

  it('passes through successful responses', (done) => {
    const interceptor = new SentryInterceptor();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/x', method: 'GET' }),
      }),
      getClass: () => ({ name: 'C' }),
      getHandler: () => ({ name: 'm' }),
    } as any;

    interceptor.intercept(ctx, { handle: () => of({ ok: true }) } as any).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
      error: done,
    });
  });

  it('reports 5xx errors to sentry', (done) => {
    const interceptor = new SentryInterceptor();
    const capture = Sentry.captureException as jest.Mock;
    capture.mockReturnValue('id' as any);

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/x', method: 'GET' }),
      }),
      getClass: () => ({ name: 'C' }),
      getHandler: () => ({ name: 'm' }),
    } as any;

    interceptor
      .intercept(ctx, {
        handle: () => throwError(() => new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR)),
      } as any)
      .subscribe({
        next: () => done(new Error('expected error')),
        error: () => {
          expect(capture).toHaveBeenCalled();
          done();
        },
      });
  });
});
