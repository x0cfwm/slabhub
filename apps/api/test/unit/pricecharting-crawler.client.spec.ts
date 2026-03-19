import { of, throwError } from 'rxjs';
import { PriceChartingClient } from '../../src/modules/pricecharting-crawler/pricecharting.client';

describe('PriceChartingClient', () => {
  it('fetches html successfully', async () => {
    const httpService = { get: jest.fn().mockReturnValue(of({ data: '<html>ok</html>' })) };
    const config = { get: jest.fn() };

    const client = new PriceChartingClient(httpService as any, config as any);
    await expect(client.fetch('https://x')).resolves.toBe('<html>ok</html>');
  });

  it('fetches binary successfully', async () => {
    const httpService = { get: jest.fn().mockReturnValue(of({ data: new Uint8Array([1, 2, 3]) })) };
    const config = { get: jest.fn() };

    const client = new PriceChartingClient(httpService as any, config as any);
    const out = await client.fetchBinary('https://x/img.jpg');
    expect(Buffer.isBuffer(out)).toBe(true);
  });

  it('retries then fails on persistent errors', async () => {
    const httpService = { get: jest.fn().mockReturnValue(throwError(() => ({ response: { status: 500 }, message: 'x' }))) };
    const config = { get: jest.fn() };

    const client = new PriceChartingClient(httpService as any, config as any);
    await expect(client.fetch('https://x', 0)).rejects.toBeTruthy();
  });
});
