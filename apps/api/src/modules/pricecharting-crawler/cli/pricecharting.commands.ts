import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { PriceChartingIngestService } from '../pricecharting.ingest.service';
import { PriceChartingCrawlOptions } from '../types';

@Command({ name: 'pricecharting:crawl:onepiece', description: 'Crawl PriceCharting One Piece catalog' })
export class CrawlOnePieceCommand extends CommandRunner {
    private readonly logger = new Logger(CrawlOnePieceCommand.name);

    constructor(private readonly ingestService: PriceChartingIngestService) {
        super();
    }

    async run(passedParam: string[], options?: PriceChartingCrawlOptions): Promise<void> {
        try {
            this.logger.log('Starting PriceCharting One Piece crawl...');
            await this.ingestService.crawlOnePieceCards(options);
            this.logger.log('PriceCharting One Piece crawl finished.');
        } catch (e) {
            this.logger.error(`Crawl failed: ${e.message}`);
            process.exit(1);
        }
    }

    @Option({
        flags: '-m, --maxProducts [number]',
        description: 'Limit number of products to crawl',
    })
    parseMaxProducts(val: string): number {
        return parseInt(val, 10);
    }

    @Option({
        flags: '-d, --dryRun',
        description: 'Dry run (no DB writes)',
        defaultValue: false,
    })
    parseDryRun(val: boolean): boolean {
        return val;
    }

    @Option({
        flags: '-l, --linkRefProducts',
        description: 'Link PriceCharting URL back to RefProduct based on TCGPlayerID',
        defaultValue: false,
    })
    parseLinkRefProducts(val: boolean): boolean {
        return val;
    }

    @Option({
        flags: '-s, --onlySetSlug [slug]',
        description: 'Only crawl a specific set slug (e.g. one-piece-500-years-in-the-future)',
    })
    parseOnlySetSlug(val: string): string {
        return val;
    }
}
