import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GradingHttpClient } from '../../src/modules/grading/http/grading-http.client';

describe('GradingHttpClient', () => {
  it('fetches PSA certificate payload', async () => {
    const httpService = { get: jest.fn().mockReturnValue(of({ data: { ok: true } })) };
    const configService = { get: jest.fn().mockReturnValue('token') };
    const client = new GradingHttpClient(httpService as any, configService as any);

    await expect(client.fetchPsaCert('123')).resolves.toEqual({ ok: true });
  });

  it('maps axios 404 to NOT_FOUND', async () => {
    const err = { response: { status: 404, statusText: 'Not Found' }, message: 'x' };
    const httpService = { get: jest.fn().mockReturnValue(throwError(() => err)) };
    const configService = { get: jest.fn().mockReturnValue('token') };

    const client = new GradingHttpClient(httpService as any, configService as any);

    await expect(client.fetchPsaCert('x')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('throws not implemented for BGS fetch', async () => {
    const client = new GradingHttpClient({ get: jest.fn() } as any, { get: jest.fn() } as any);
    await expect(client.fetchBgsPage('1')).rejects.toMatchObject({ status: HttpStatus.NOT_IMPLEMENTED });
  });
});
