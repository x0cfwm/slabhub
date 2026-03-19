import { canonicalizeUrl, extractSlug } from '../../src/modules/pricecharting-crawler/utils/url';

describe('PriceCharting URL utils', () => {
  it('extracts slug from absolute and relative urls', () => {
    expect(extractSlug('https://a.com/game/op01/item', 'game')).toBe('op01');
    expect(extractSlug('/game/op02/item?x=1', 'game')).toBe('op02');
  });

  it('canonicalizes relative url', () => {
    expect(canonicalizeUrl('/x/y', 'https://a.com')).toBe('https://a.com/x/y');
  });
});
