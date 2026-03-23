import axios from 'axios';
import { PriceChartingParser } from '../../src/modules/market/parsers/pricecharting.parser';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Market PriceChartingParser', () => {
  it('parses summary and sales rows', async () => {
    const html = `
      <div id="used_price"><span class="price">$12.00</span></div>
      <div class="completed-auctions-used">
        <table class="hoverable-rows">
          <tbody>
            <tr>
              <td class="date">2026-01-01</td>
              <td class="title"><a href="/sale/1">Card sold on eBay</a></td>
              <td class="price"><span class="js-price">$11.00</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    mockedAxios.get.mockResolvedValue({ data: html } as any);

    const parser = new PriceChartingParser({ get: jest.fn().mockReturnValue(undefined) } as any);
    const out = await parser.parse('https://pricecharting.com/x');

    expect(out.summary.ungraded).toBe(12);
    expect(out.sales[0].price).toBe(11);
    expect(out.sales[0].source).toBe('eBay');
  });

  it('throws when no entries and no ungraded summary found', async () => {
    mockedAxios.get.mockResolvedValue({ data: '<html><body>empty</body></html>' } as any);
    const parser = new PriceChartingParser({ get: jest.fn().mockReturnValue(undefined) } as any);
    await expect(parser.parse('https://x')).rejects.toBeTruthy();
  });
});
