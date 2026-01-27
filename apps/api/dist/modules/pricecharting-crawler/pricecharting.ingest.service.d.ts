import { PrismaService } from '../prisma/prisma.service';
import { PriceChartingClient } from './pricecharting.client';
import { PriceChartingParser } from './pricecharting.parser';
import { PriceChartingCrawlOptions } from './types';
export declare class PriceChartingIngestService {
    private readonly prisma;
    private readonly client;
    private readonly parser;
    private readonly logger;
    private visitedUrls;
    constructor(prisma: PrismaService, client: PriceChartingClient, parser: PriceChartingParser);
    crawlOnePieceCards(options?: PriceChartingCrawlOptions): Promise<void>;
    private crawlSetPages;
    private crawlAndIngestProduct;
    private upsertProduct;
    private linkToRefProduct;
}
