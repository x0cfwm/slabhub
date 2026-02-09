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
        const mappingName = 'pricecharting:crawl:onepiece';
        const entrypoint = 'https://www.pricecharting.com/category/one-piece-cards';
        this.logger.log(`Starting crawl from ${entrypoint}`);

        this.visitedUrls.clear();
        let productCount = 0;
        const { fresh = false, dryRun = false } = options;

        // Handle interruption signals to update status instead of leaving it as "RUNNING"
        let isShuttingDown = false;
        const handleShutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            this.logger.warn(`Received ${signal}. Gracefully stopping and updating status...`);
            if (!dryRun) {
                await this.prisma.refSyncProgress.update({
                    where: { mappingName },
                    data: { status: 'FAILED', lastError: `Interrupted by ${signal}` }
                }).catch(() => { });
            }
            process.exit(signal === 'SIGINT' ? 130 : 1);
        };

        const sigintListener = () => handleShutdown('SIGINT');
        const sigtermListener = () => handleShutdown('SIGTERM');

        process.on('SIGINT', sigintListener);
        process.on('SIGTERM', sigtermListener);

        // Load progress from DB
        let progress = await this.prisma.refSyncProgress.findUnique({
            where: { mappingName }
        });

        // Handle fresh sync request or completed sync
        if (progress && (fresh || progress.status === 'COMPLETED')) {
            this.logger.log(`${fresh ? 'Fresh sync requested' : 'Previous sync was completed'}. Resetting progress for ${mappingName}...`);
            await this.prisma.refSyncProgress.delete({ where: { mappingName } });
            progress = null;
        }

        let resumeSetIndex = progress?.page ? progress.page - 1 : 0; // 0-indexed internally
        let resumeProductUrl = progress?.cursor;
        let totalProcessed = progress?.processedItems ?? 0;
        let foundResumeProduct = !resumeProductUrl;

        this.logger.log(`Starting crawl... ${progress ? `(Resuming from set ${resumeSetIndex + 1}${resumeProductUrl ? ', product ' + resumeProductUrl : ''})` : '(Fresh Start)'}`);

        try {
            const categoryHtml = await this.client.fetch(entrypoint);
            const setUrls = this.parser.parseCategoryPage(categoryHtml, 'https://www.pricecharting.com');

            this.logger.log(`Found ${setUrls.length} sets. Crawling sets...`);

            for (let setIdx = resumeSetIndex; setIdx < setUrls.length; setIdx++) {
                const setUrl = setUrls[setIdx];
                if (options.onlySetSlug && !setUrl.includes(options.onlySetSlug)) {
                    continue;
                }

                this.logger.log(`Crawling set [${setIdx + 1}/${setUrls.length}]: ${setUrl}`);
                const productUrls = await this.crawlSetPages(setUrl);

                for (const productUrl of productUrls) {
                    if (this.visitedUrls.has(productUrl)) continue;

                    // Skip until we find the resume product if it was set
                    if (!foundResumeProduct) {
                        if (productUrl === resumeProductUrl) {
                            this.logger.log(`Found resume product ${productUrl}. Resuming from next...`);
                            foundResumeProduct = true;
                        }
                        continue;
                    }

                    if (options.maxProducts && productCount >= options.maxProducts) {
                        this.logger.log(`Reached maxProducts limit (${options.maxProducts}). Stopping.`);
                        return;
                    }

                    try {
                        await this.crawlAndIngestProduct(productUrl, options);
                        this.visitedUrls.add(productUrl);
                        productCount++;
                        totalProcessed++;

                        if (!dryRun) {
                            // Update progress after each product
                            await this.prisma.refSyncProgress.upsert({
                                where: { mappingName },
                                update: {
                                    page: setIdx + 1, // 1-indexed set
                                    cursor: productUrl,
                                    processedItems: totalProcessed,
                                    status: 'RUNNING',
                                    lastSyncAt: new Date(),
                                },
                                create: {
                                    mappingName,
                                    page: setIdx + 1,
                                    cursor: productUrl,
                                    processedItems: totalProcessed,
                                    status: 'RUNNING',
                                }
                            });
                        }

                        if (productCount % 10 === 0) {
                            this.logger.log(`Progress: ${productCount} products ingested...`);
                        }
                    } catch (error) {
                        this.logger.error(`Error ingesting product ${productUrl}: ${error.message}`);
                        // Update progress even on error to avoid infinite retry on same failing product
                        if (!dryRun) {
                            await this.prisma.refSyncProgress.update({
                                where: { mappingName },
                                data: {
                                    cursor: productUrl,
                                    lastError: error.message,
                                    updatedAt: new Date(),
                                }
                            });
                        }
                    }
                }

                // Set foundResumeProduct to true after finishing the set we were resuming in 
                // so we don't skip products in subsequent sets
                foundResumeProduct = true;
            }

            if (!dryRun) {
                await this.prisma.refSyncProgress.upsert({
                    where: { mappingName },
                    update: { status: 'COMPLETED', lastSyncAt: new Date() },
                    create: { mappingName, status: 'COMPLETED' }
                });
            }

            this.logger.log(`Crawl completed. Ingested ${productCount} products.`);
        } catch (error) {
            if (!dryRun) {
                await this.prisma.refSyncProgress.upsert({
                    where: { mappingName },
                    update: { status: 'FAILED', lastError: error.message },
                    create: { mappingName, status: 'FAILED', lastError: error.message }
                }).catch(() => { });
            }
            this.logger.error(`Crawl failed: ${error.message}`);
            throw error;
        } finally {
            process.off('SIGINT', sigintListener);
            process.off('SIGTERM', sigtermListener);
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
                title: data.title,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
                productType: data.productType,
                rawPrice: data.rawPrice,
                sealedPrice: data.sealedPrice,
                grade7Price: data.grade7Price,
                grade8Price: data.grade8Price,
                grade9Price: data.grade9Price,
                grade95Price: data.grade95Price,
                grade10Price: data.grade10Price,
                priceSource: 'PriceCharting',
                priceUpdatedAt: new Date(),
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
                title: data.title,
                productSlug: data.productSlug,
                localImagePath: data.localImagePath,
                imageUrl: data.imageUrl,
                productType: data.productType,
                rawPrice: data.rawPrice,
                sealedPrice: data.sealedPrice,
                grade7Price: data.grade7Price,
                grade8Price: data.grade8Price,
                grade9Price: data.grade9Price,
                grade95Price: data.grade95Price,
                grade10Price: data.grade10Price,
                priceSource: 'PriceCharting',
                priceUpdatedAt: new Date(),
            },
        });
    }

    private async linkToRefProduct(tcgPlayerId: number, productUrl: string) {
        // Find the newly ingested data to get the prices
        const pcProduct = await this.prisma.refPriceChartingProduct.findUnique({
            where: { productUrl }
        });

        if (!pcProduct) return;

        const tcgplayerIdStr = tcgPlayerId.toString();

        await this.prisma.refProduct.updateMany({
            where: {
                tcgplayerId: tcgplayerIdStr
            },
            data: {
                rawPrice: pcProduct.rawPrice,
                sealedPrice: pcProduct.sealedPrice,
                grade7Price: pcProduct.grade7Price,
                grade8Price: pcProduct.grade8Price,
                grade9Price: pcProduct.grade9Price,
                grade95Price: pcProduct.grade95Price,
                grade10Price: pcProduct.grade10Price,
                priceSource: 'PriceCharting',
                priceUpdatedAt: pcProduct.priceUpdatedAt,
            }
        });
    }
}
