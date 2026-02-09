import { CommandRunner } from 'nest-commander';
import { PriceChartingIngestService } from '../pricecharting.ingest.service';
import { PriceChartingCrawlOptions } from '../types';
export declare class CrawlOnePieceCommand extends CommandRunner {
    private readonly ingestService;
    private readonly logger;
    constructor(ingestService: PriceChartingIngestService);
    run(passedParam: string[], options?: PriceChartingCrawlOptions): Promise<void>;
    parseMaxProducts(val: string): number;
    parseDryRun(val: boolean): boolean;
    parseLinkRefProducts(val: boolean): boolean;
    parseOnlySetSlug(val: string): string;
    parseFresh(val: boolean): boolean;
}
