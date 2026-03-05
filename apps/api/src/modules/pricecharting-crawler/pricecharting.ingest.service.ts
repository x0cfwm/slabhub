import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceChartingClient } from './pricecharting.client';
import { PriceChartingParser } from './pricecharting.parser';
import { PriceChartingCrawlOptions, ParsedProductDetails } from './types';
import * as fs from 'fs';
import * as path from 'path';

import { MediaService } from '../media/media.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class PriceChartingIngestService {
    private readonly logger = new Logger(PriceChartingIngestService.name);
    private visitedUrls = new Set<string>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly client: PriceChartingClient,
        private readonly parser: PriceChartingParser,
        private readonly mediaService: MediaService,
        private readonly inventoryService: InventoryService,
    ) { }

    async crawlOnePieceCards(options: PriceChartingCrawlOptions = {}) {
        const mappingName = 'pricecharting:crawl:onepiece';
        const entrypoint = 'https://www.pricecharting.com/category/one-piece-cards';
        this.logger.log(`Starting crawl from ${entrypoint}`);

        this.visitedUrls.clear();
        let productCount = 0;
        const { fresh = false, dryRun = false } = options;
        const concurrencyLimit = 40;

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
                if (isShuttingDown) break;

                const setUrl = setUrls[setIdx];
                if (options.onlySetSlug && !setUrl.includes(options.onlySetSlug)) {
                    continue;
                }

                this.logger.log(`Crawling set [${setIdx + 1}/${setUrls.length}]: ${setUrl}`);
                const { productUrls, setCode, setName } = await this.crawlSetPages(setUrl);

                if (setName) {
                    const setSlug = setUrl.split('/').filter(Boolean).pop();

                    // First try to find by slug to avoid unique constraint conflicts on slug if naming differs
                    const existingBySlug = await this.prisma.refPriceChartingSet.findUnique({
                        where: { slug: setSlug }
                    });

                    const effectiveName = existingBySlug ? existingBySlug.name : setName;

                    await this.prisma.refPriceChartingSet.upsert({
                        where: { name: effectiveName },
                        update: { code: setCode, slug: setSlug },
                        create: { name: effectiveName, code: setCode, slug: setSlug },
                    });

                    if (setCode) {
                        this.logger.log(`Updated Set Code: ${setCode} for set "${effectiveName}"`);
                    }
                }

                // Filter products for resume logic
                const productsToProcess = [];
                for (const productUrl of productUrls) {
                    if (this.visitedUrls.has(productUrl)) continue;

                    if (!foundResumeProduct) {
                        if (productUrl === resumeProductUrl) {
                            this.logger.log(`Found resume product ${productUrl}. Resuming from next...`);
                            foundResumeProduct = true;
                        }
                        continue;
                    }
                    productsToProcess.push(productUrl);
                }

                // Process products in parallel chunks
                for (let i = 0; i < productsToProcess.length; i += concurrencyLimit) {
                    if (isShuttingDown) break;
                    if (options.maxProducts && productCount >= options.maxProducts) break;

                    const chunk = productsToProcess.slice(i, i + concurrencyLimit);
                    await Promise.all(chunk.map(async (productUrl) => {
                        if (isShuttingDown) return;
                        if (options.maxProducts && productCount >= options.maxProducts) return;

                        try {
                            await this.crawlAndIngestProduct(productUrl, options, setCode);
                            this.visitedUrls.add(productUrl);
                            productCount++;
                            totalProcessed++;
                        } catch (error) {
                            this.logger.error(`Error ingesting product ${productUrl}: ${error.message}`);
                        }
                    }));

                    // Update progress after each chunk to reduce DB pressure
                    if (!dryRun && chunk.length > 0) {
                        const lastProductUrl = chunk[chunk.length - 1];
                        await this.prisma.refSyncProgress.upsert({
                            where: { mappingName },
                            update: {
                                page: setIdx + 1,
                                cursor: lastProductUrl,
                                processedItems: totalProcessed,
                                status: 'RUNNING',
                                lastSyncAt: new Date(),
                            },
                            create: {
                                mappingName,
                                page: setIdx + 1,
                                cursor: lastProductUrl,
                                processedItems: totalProcessed,
                                status: 'RUNNING',
                            }
                        });
                    }

                    this.logger.log(`Progress: ${productCount} products processed in this session (${totalProcessed} total)`);
                }

                foundResumeProduct = true; // Finished the set we were resuming in
            }

            if (!dryRun && !isShuttingDown) {
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

    private async crawlSetPages(setUrl: string): Promise<{ productUrls: string[]; setCode?: string; setName?: string }> {
        const allProductUrls: string[] = [];
        const visitedPages = new Set<string>();
        const queuedPages = [setUrl];
        let setCode: string | undefined;
        let setName: string | undefined;

        // Breadth-first search for products across paginated pages
        while (queuedPages.length > 0) {
            const batch = queuedPages.splice(0, 5); // Process up to 5 paginated pages in parallel
            await Promise.all(batch.map(async (currentUrl) => {
                if (visitedPages.has(currentUrl)) return;
                visitedPages.add(currentUrl);

                try {
                    const html = await this.client.fetch(currentUrl);
                    const parsed = this.parser.parseSetPage(html, 'https://www.pricecharting.com');

                    if (parsed.setCode && !setCode) {
                        setCode = parsed.setCode;
                    }
                    if (parsed.setName && !setName) {
                        setName = parsed.setName;
                    }

                    synchronizedPush(allProductUrls, ...parsed.productUrls);

                    for (const nextPage of parsed.nextPages) {
                        if (!visitedPages.has(nextPage)) {
                            queuedPages.push(nextPage);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Error crawling set page ${currentUrl}: ${error.message}`);
                }
            }));
        }

        return {
            productUrls: [...new Set(allProductUrls)],
            setCode,
            setName,
        };
    }

    private async crawlAndIngestProduct(url: string, options: PriceChartingCrawlOptions, setCode?: string) {
        // Optimization: Check if we already processed this product recently
        if (!options.fresh) {
            const existing = await this.prisma.refPriceChartingProduct.findUnique({
                where: { productUrl: url },
                select: { lastParsedAt: true } as any
            }) as any;

            // If parsed in the last 12 hours, skip (unless it's a fresh crawl)
            if (existing?.lastParsedAt && (Date.now() - new Date(existing.lastParsedAt).getTime() < 12 * 60 * 60 * 1000)) {
                this.logger.debug(`Skipping ${url}, already parsed recently.`);
                return;
            }
        }

        const html = await this.client.fetch(url);
        const parsed = this.parser.parseProductPage(html, url);
        parsed.categorySlug = 'one-piece-cards';

        if (setCode) {
            parsed.setCode = setCode;
        }

        if (options.images && parsed.imageUrl) {
            try {
                // Potential Speedup: Check if we already have this image by source URL
                const existingMedia = await this.prisma.media.findFirst({
                    where: { sourceUrl: parsed.imageUrl }
                });

                if (existingMedia) {
                    parsed.imageUrl = this.mediaService.getPublicUrl(existingMedia, { preferCdn: true });
                    parsed.localImagePath = parsed.imageUrl;
                } else {
                    const media = await this.mediaService.putFromRemoteUrl(parsed.imageUrl, {
                        sourceUrl: parsed.imageUrl,
                    });
                    parsed.imageUrl = this.mediaService.getPublicUrl(media, { preferCdn: true });
                    parsed.localImagePath = parsed.imageUrl;
                }
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
            const existingSet = await this.prisma.refPriceChartingSet.findUnique({
                where: { name: data.setName },
                select: { code: true }
            });

            const set = await this.prisma.refPriceChartingSet.upsert({
                where: { name: data.setName },
                update: {
                    slug: data.setSlug,
                    code: existingSet?.code || data.setCode,
                },
                create: {
                    name: data.setName,
                    slug: data.setSlug,
                    code: data.setCode,
                },
            });
            setId = set.id;
        }

        const product = await this.prisma.refPriceChartingProduct.upsert({
            where: { productUrl: data.productUrl },
            update: {
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details as any,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                set: setId ? { connect: { id: setId } } : undefined,
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
                scrapedAt: new Date(),
                lastParsedAt: new Date(),
            } as any,
            create: {
                productUrl: data.productUrl,
                tcgPlayerId: data.tcgPlayerId,
                priceChartingId: data.priceChartingId,
                cardNumber: data.cardNumber,
                details: data.details as any,
                categorySlug: data.categorySlug,
                setSlug: data.setSlug,
                set: setId ? { connect: { id: setId } } : undefined,
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
                lastParsedAt: new Date(),
            } as any,
        });

        // Trigger recalulation of inventory snapshots for this product
        this.inventoryService.recalculateMarketPriceSnapshots(product.id).catch(err => {
            this.logger.error(`Failed to recalculate snapshots for ${product.id}: ${err.message}`);
        });

        // Store sales
        if (data.sales && data.sales.length > 0) {
            // Archival Logic: Don't delete old sales, just add new unique ones
            const existingSales = await (this.prisma.priceChartingSales as any).findMany({
                where: { productId: product.id },
                select: { id: true, date: true, title: true, price: true, grade: true }
            });

            const seenIds: string[] = [];
            const newSales: any[] = [];

            for (const sale of data.sales) {
                const saleDate = new Date(sale.date);
                const existing = existingSales.find((e: any) =>
                    e.date.getTime() === saleDate.getTime() &&
                    e.title === sale.title &&
                    Number(e.price) === sale.price &&
                    e.grade === (sale.grade || null)
                );

                if (existing) {
                    seenIds.push(existing.id);
                } else {
                    newSales.push({
                        productId: product.id,
                        date: saleDate,
                        title: sale.title,
                        price: sale.price,
                        source: sale.source,
                        link: sale.link,
                        grade: sale.grade,
                        lastSeenAt: new Date(),
                    });
                }
            }

            // Update lastSeenAt for existing records
            if (seenIds.length > 0) {
                await (this.prisma.priceChartingSales as any).updateMany({
                    where: { id: { in: seenIds } },
                    data: { lastSeenAt: new Date() }
                });
            }

            // Create new records
            if (newSales.length > 0) {
                await (this.prisma.priceChartingSales as any).createMany({
                    data: newSales
                });
            }
        }
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
                rawPrice: (pcProduct as any).rawPrice,
                sealedPrice: (pcProduct as any).sealedPrice,
                grade7Price: (pcProduct as any).grade7Price,
                grade8Price: (pcProduct as any).grade8Price,
                grade9Price: (pcProduct as any).grade9Price,
                grade95Price: (pcProduct as any).grade95Price,
                grade10Price: (pcProduct as any).grade10Price,
                priceSource: 'PriceCharting',
                priceUpdatedAt: (pcProduct as any).priceUpdatedAt,
            }
        });
    }
}

function synchronizedPush<T>(array: T[], ...items: T[]) {
    array.push(...items);
}
