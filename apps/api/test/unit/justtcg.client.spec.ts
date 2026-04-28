import { of, throwError } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import { JustTcgClient } from '../../src/modules/justtcg/justtcg.client';

describe('JustTcgClient', () => {
  const mapping = {
    name: 'games',
    endpoint: '/v1/games',
    pagination: 'page',
    unique: { sourceField: 'id', targetField: 'externalId' },
    model: 'RefGame',
    fields: [],
  } as any;

  it('fetches one page successfully', async () => {
    const httpService = {
      get: jest.fn().mockReturnValue(
        of({
          data: {
            data: [{ id: '1' }],
            meta: { lastPage: 1 },
            _metadata: {
              apiRequestLimit: 1000,
              apiDailyLimit: 100,
              apiRateLimit: 10,
              apiRequestsUsed: 1,
              apiDailyRequestsUsed: 1,
              apiRequestsRemaining: 9,
              apiDailyRequestsRemaining: 99,
              apiPlan: 'test',
            },
          },
        }),
      ),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: any) => {
        if (key === 'JUSTTCG_BASE_URL') {return 'https://api.justtcg.com';}
        return fallback;
      }),
      getOrThrow: jest.fn(() => 'k1,k2'),
    };

    const client = new JustTcgClient(httpService as any, configService as any);
    const out = await client.fetchPage(mapping, 1);

    expect(out.data).toHaveLength(1);
    expect(httpService.get).toHaveBeenCalled();
  });

  it('throws if all keys become invalid', async () => {
    const httpService = {
      get: jest.fn().mockReturnValue(
        throwError(() => ({ response: { status: 401, data: {} }, message: 'unauthorized' })),
      ),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: any) => {
        if (key === 'JUSTTCG_BASE_URL') {return 'https://api.justtcg.com';}
        return fallback;
      }),
      getOrThrow: jest.fn(() => 'k1'),
    };

    const client = new JustTcgClient(httpService as any, configService as any);

    await expect(client.fetchPage(mapping, 1)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
