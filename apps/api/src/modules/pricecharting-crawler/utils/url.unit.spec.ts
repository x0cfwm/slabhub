import { distillMarketplaceUrl } from './url';

describe('distillMarketplaceUrl', () => {
    it('should distill TCGplayer referral links', () => {
        const referral = 'https://partner.tcgplayer.com/c/3029031/1780961/21018?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F643869%2F-';
        const expected = 'https://www.tcgplayer.com/product/643869';
        expect(distillMarketplaceUrl(referral)).toBe(expected);
    });

    it('should handle TCGplayer direct links with tracking and titles', () => {
        const direct = 'https://www.tcgplayer.com/product/123456/shiny-charizard-vmax?utm_source=pricecharting&utm_medium=referral';
        const expected = 'https://www.tcgplayer.com/product/123456';
        expect(distillMarketplaceUrl(direct)).toBe(expected);
    });

    it('should handle TCGplayer direct links with trailing dashes', () => {
        const direct = 'https://www.tcgplayer.com/product/558166/-';
        const expected = 'https://www.tcgplayer.com/product/558166';
        expect(distillMarketplaceUrl(direct)).toBe(expected);
    });

    it('should distill eBay item links by removing all tracking params', () => {
        const ebay = 'https://www.ebay.com/itm/317134549520?nordt=true&rt=nc&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=5339009860&customid=noId&toolid=10001';
        const expected = 'https://www.ebay.com/itm/317134549520';
        expect(distillMarketplaceUrl(ebay)).toBe(expected);
    });

    it('should handle international eBay domains', () => {
        const ebay = 'https://www.ebay.it/itm/186977845385?nordt=true&rt=nc';
        const expected = 'https://www.ebay.it/itm/186977845385';
        expect(distillMarketplaceUrl(ebay)).toBe(expected);
    });

    it('should preserve PriceCharting URLs but remove query params if present via default fallback', () => {
        // PriceCharting URLs are usually handled by canonicalizeUrl, but distillMarketplaceUrl should be safe
        const pc = 'https://www.pricecharting.com/game/one-piece-cards/vivi-op03-001?some=param';
        const expected = 'https://www.pricecharting.com/game/one-piece-cards/vivi-op03-001'; // only strips query by fallback logic split('?')[0] if hostname contains pricecharting
        expect(distillMarketplaceUrl(pc)).toBe(expected);
    });

    it('should handle non-marketplace URLs by stripping query params', () => {
        const general = 'https://example.com/page?ref=123';
        const expected = 'https://example.com/page';
        expect(distillMarketplaceUrl(general)).toBe(expected);
    });

    it('should handle nested referral links (edge case)', () => {
        const nested = 'https://partner.tcgplayer.com/c/1/2/3?u=' + encodeURIComponent('https://partner.tcgplayer.com/c/4/5/6?u=' + encodeURIComponent('https://www.tcgplayer.com/product/999'));
        const expected = 'https://www.tcgplayer.com/product/999';
        expect(distillMarketplaceUrl(nested)).toBe(expected);
    });

    it('should handle empty or null links gracefully', () => {
        expect(distillMarketplaceUrl('')).toBe('');
        expect((distillMarketplaceUrl as any)(null)).toBe(null);
    });
});
