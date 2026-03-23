import { PriceChartingParser } from '../../src/modules/pricecharting-crawler/pricecharting.parser';

describe('PriceChartingCrawler Parser', () => {
  it('parses set urls from category page', () => {
    const parser = new PriceChartingParser();
    const html = `<div id="home-page"><a href="/console/one-piece-op01">OP01</a></div>`;
    const out = parser.parseCategoryPage(html, 'https://www.pricecharting.com');
    expect(out).toContain('https://www.pricecharting.com/console/one-piece-op01');
  });

  it('parses set page products and set metadata', () => {
    const parser = new PriceChartingParser();
    const html = `
      <div class="section-description">Set Code: OP05-119</div>
      <a href="/game/one-piece-op05/card-a">A</a>
      <div class="pagination"><a href="/console/op05?page=2">2</a></div>
    `;

    const out = parser.parseSetPage(html, 'https://www.pricecharting.com');
    expect(out.productUrls[0]).toContain('/game/one-piece-op05/card-a');
    expect(out.setCode).toBe('OP05');
    expect(out.nextPages[0]).toBe('https://www.pricecharting.com/console/op05');
  });

  it('classifies product page and extracts details', () => {
    const parser = new PriceChartingParser();
    const html = `
      <h1>Romance Dawn Booster Box</h1>
      <div class="details"><table><tr><td>TCGPlayer ID</td><td>123</td></tr></table></div>
      <div class="cover"><img src="/img.jpg" /></div>
    `;

    const out = parser.parseProductPage(html, 'https://www.pricecharting.com/game/op01/item-1');
    expect(out.tcgPlayerId).toBe(123);
    expect(out.productType).toBe('SEALED_BOX');
    expect(out.imageUrl).toContain('/img.jpg');
  });
});
