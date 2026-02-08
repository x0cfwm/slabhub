import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceChartingClient } from './pricecharting.client';
import { PriceChartingParser } from './pricecharting.parser';
import { PriceChartingCrawlOptions, ParsedProductDetails } from './types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PriceChartingIngestService {
    private readonly logger = new Logger(PriceChartingIngestService.name);
    private visitedUrls = new Set<string>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly client: PriceChartingClient,
        private readonly parser: PriceChartingParser,
    ) { }

    async crawlOnePieceCards(options: PriceChartingCrawlOptions = {}) {
        const entrypoint = 'https://www.pricecharting.com/category/one-piece-cards';
        this.logger.log(`Starting crawl from ${entrypoint}`);

        this.visitedUrls.clear();
        let productCount = 0;

        try {
            const categoryHtml = await this.client.fetch(entrypoint);
            const setUrls = this.parser.parseCategoryPage(categoryHtml, 'https://www.pricecharting.com');

            this.logger.log(`Found ${setUrls.length} sets. Crawling sets...`);

            for (const setUrl of setUrls) {
                if (options.onlySetSlug && !setUrl.includes(options.onlySetSlug)) {
                    continue;
                }

                this.logger.log(`Crawling set: ${setUrl}`);
                const productUrls = await this.crawlSetPages(setUrl);

                for (const productUrl of productUrls) {
                    if (this.visitedUrls.has(productUrl)) continue;

                    if (options.maxProducts && productCount >= options.maxProducts) {
                        this.logger.log(`Reached maxProducts limit (${options.maxProducts}). Stopping.`);
                        return;
                    }

                    try {
                        await this.crawlAndIngestProduct(productUrl, options);
                        this.visitedUrls.add(productUrl);
                        productCount++;

                        if (productCount % 10 === 0) {
                            this.logger.log(`Progress: ${productCount} products ingested...`);
                        }
                    } catch (error) {
                        this.logger.error(`Error ingesting product ${productUrl}: ${error.message}`);
                        // Continue to next product
                    }
                }
            }

            this.logger.log(`Crawl completed. Ingested ${productCount} products.`);
        } catch (error) {
            this.logger.error(`Crawl failed: ${error.message}`);
            throw error;
        }
    }

    private async crawlSetPages(setUrl: string): Promise<string[]> {
        const allProductUrls: string[] = [];
        const queuedPages = [setUrl];
        const visitedPages = new Set<string>();

        while (queuedPages.length > 0) {
            const currentUrl = queuedPages.shift()!;
            if (visitedPages.has(currentUrl)) continue;
            visitedPages.add(currentUrl);

            try {
                const html = await this.client.fetch(currentUrl);
                const { productUrls, nextPages } = this.parser.parseSetPage(html, 'https://www.pricecharting.com');

                allProductUrls.push(...productUrls);

                for (const nextPage of nextPages) {
                    if (!visitedPages.has(nextPage)) {
                        queuedPages.push(nextPage);
                    }
                }
            } catch (error) {
                this.logger.error(`Error crawling set page ${currentUrl}: ${error.message}`);
            }
        }

        return [...new Set(allProductUrls)];
    }

    private async crawlAndIngestProduct(url: string, options: PriceChartingCrawlOptions) {
        const html = await this.client.fetch(url);
        const parsed = this.parser.parseProductPage(html, url);
        parsed.categorySlug = 'one-piece-cards';

        if (parsed.imageUrl) {
            try {
                parsed.localImagePath = await this.downloadImage(parsed.imageUrl, parsed.productSlug || 'unknown');
            } catch (error) {
                this.logger.error(`Failed to download image for ${url}: ${error.message}`);
            }
        }

        if (options.dryRun) {
            this.logger.log(`[DRY RUN] Would ingest: ${parsed.productUrl} (TCGPlayerID: ${parsed.tcgPlayerId})`);
            return;
        }

        await this.upsertProduct(parsed);

        if (options.linkRefProducts && parsed.tcgPlayerId) {
            await this.linkToRefProduct(parsed.tcgPlayerId, parsed.productUrl);
        }
    }

    private async downloadImage(url: string, slug: string): Promise<string | undefined> {
        const buffer = await this.client.fetchBinary(url);
        const uploadDir = path.join(process.cwd(), 'uploads', 'pricecharting');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `${slug}.${extension}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);

        // Return relative path for storage
        return `/uploads/pricecharting/${fileName}`;
    }

    private async upsertProduct(data: ParsedProductDetails) {
        let setId: string | undefined;

        if (data.setName) {
            const set = await this.prisma.refPriceChartingSet.upsert({
                where: { name: data.setName },
                update: {
                    slug: data.setSlug,
                },
                create: {
                    name: data.setName,
                    slug: data.setSlug,
                },
            });
            setId = set.id;
        }

        await this.prisma.refPriceChartingProduct.upsert({
            where: { productUrl: data.productUrl },
            update: {
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details as any,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                setId: setId,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
                productType: data.productType,
                scrapedAt: new Date(),
            },
            create: {
                productUrl: data.productUrl,
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details as any,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                setId: setId,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
                productType: data.productType,
            },
        });
    }

    private async linkToRefProduct(tcgPlayerId: number, productUrl: string) {
        // RefProduct has tcgplayerId as String? (lowercase p)
        // RefPriceChartingProduct has tcgPlayerId as Int? (PascalCase P)

        const tcgplayerIdStr = tcgPlayerId.toString();

        await this.prisma.refProduct.updateMany({
            where: {
                tcgplayerId: tcgplayerIdStr
            },
            data: {
                // No need to update priceChartingUrl anymore as it's pulled on the fly
                // We just ensure the link exists if it was somehow different
                tcgplayerId: tcgplayerIdStr
            }
        });
    }
}
