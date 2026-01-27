import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceChartingClient } from './pricecharting.client';
import { PriceChartingParser } from './pricecharting.parser';
import { PriceChartingIngestService } from './pricecharting.ingest.service';
import { CrawlOnePieceCommand } from './cli/pricecharting.commands';

@Module({
    imports: [HttpModule, PrismaModule],
    providers: [
        PriceChartingClient,
        PriceChartingParser,
        PriceChartingIngestService,
        CrawlOnePieceCommand,
    ],
    exports: [PriceChartingIngestService],
})
export class PriceChartingCrawlerModule { }
