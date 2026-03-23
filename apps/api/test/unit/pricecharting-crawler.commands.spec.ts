import { CrawlOnePieceCommand } from '../../src/modules/pricecharting-crawler/cli/pricecharting.commands';

describe('PriceCharting crawl command', () => {
  it('runs ingest service with options', async () => {
    const ingestService = { crawlOnePieceCards: jest.fn().mockResolvedValue(undefined) };
    const cmd = new CrawlOnePieceCommand(ingestService as any);

    await cmd.run([], { maxProducts: 10, dryRun: true, fresh: true } as any);
    expect(ingestService.crawlOnePieceCards).toHaveBeenCalledWith({ maxProducts: 10, dryRun: true, fresh: true });

    expect(cmd.parseMaxProducts('10')).toBe(10);
    expect(cmd.parseDryRun(true)).toBe(true);
    expect(cmd.parseFresh(true)).toBe(true);
  });
});
