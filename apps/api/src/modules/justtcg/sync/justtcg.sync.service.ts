import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JustTcgClient } from '../justtcg.client';
import { JUSTTCG_MAPPINGS } from '../justtcg.mappings';
import { JustTcgMapping } from '../justtcg.types';

@Injectable()
export class JustTcgSyncService {
    private readonly logger = new Logger(JustTcgSyncService.name);

    constructor(
        private readonly client: JustTcgClient,
        private readonly prisma: PrismaService,
    ) { }

    async syncAll(options: { only?: string[]; dryRun?: boolean; fresh?: boolean } = {}) {
        const mappings = JUSTTCG_MAPPINGS.filter((m) => {
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });

        for (const mapping of mappings) {
            await this.syncMapping(mapping, options);
        }
    }

    async syncDictionaries(options: { only?: string[]; dryRun?: boolean; fresh?: boolean } = {}) {
        const mappings = JUSTTCG_MAPPINGS.filter((m) => {
            if (m.name === 'catalog') return false;
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });

        for (const mapping of mappings) {
            await this.syncMapping(mapping, options);
        }
    }

    async syncCatalog(options: { dryRun?: boolean; fresh?: boolean } = {}) {
        const mapping = JUSTTCG_MAPPINGS.find((m) => m.name === 'catalog');
        if (mapping) {
            await this.syncMapping(mapping, options);
        }
    }

    private async syncMapping(mapping: JustTcgMapping, options: { dryRun?: boolean; fresh?: boolean } = {}) {
        const { dryRun = false, fresh = false } = options;
        const startTime = Date.now();

        // Load progress from DB
        let progress = await this.prisma.refSyncProgress.findUnique({
            where: { mappingName: mapping.name }
        });

        // Handle fresh sync request or completed sync
        if (progress && (fresh || progress.status === 'COMPLETED')) {
            this.logger.log(`${fresh ? 'Fresh sync requested' : 'Previous sync was completed'}. Resetting progress for ${mapping.name}...`);
            await this.prisma.refSyncProgress.delete({ where: { mappingName: mapping.name } });
            progress = null;
        }

        let currentOffset = progress?.offset ?? 0;
        let currentPage = progress?.page ?? 1;
        let currentCursor = progress?.cursor ?? undefined;
        let totalProcessed = progress?.processedItems ?? 0;
        let totalItems: number | undefined = progress?.totalItems ?? undefined;

        this.logger.log(`Starting sync for ${mapping.name}... ${progress ? `(Resuming from ${mapping.pagination === 'offset' ? 'offset ' + currentOffset : 'page ' + currentPage})` : '(Fresh Start)'}`);

        try {
            const concurrency = mapping.concurrency ?? 1;
            const limit = mapping.limit ?? 20;

            let hasNextPage = true;

            while (hasNextPage) {
                const batchPromises = [];
                // We can only pre-fetch if pagination is offset or page-based.
                // Cursor-based requires the previous result's cursor.
                const currentBatchSize = mapping.pagination === 'cursor' || mapping.pagination === 'none' ? 1 : concurrency;

                for (let i = 0; i < currentBatchSize && hasNextPage; i++) {
                    batchPromises.push(this.client.fetchPage(mapping, currentPage, currentCursor, currentOffset));

                    // Optimistic increment for the next request in the batch
                    if (mapping.pagination === 'offset') {
                        currentOffset += limit;
                    } else if (mapping.pagination === 'page') {
                        currentPage++;
                    } else if (mapping.pagination === 'none') {
                        hasNextPage = false;
                    }
                }

                const responses = await Promise.all(batchPromises);

                for (const response of responses) {
                    totalItems = response.meta?.total;
                    const items = response.data;
                    const mappedItems = items.map((item) => this.mapFields(item, mapping));

                    if (!dryRun) {
                        await this.upsertItems(mapping.model, mapping.unique.targetField, mappedItems);

                        totalProcessed += items.length;
                        if (mapping.pagination === 'cursor') {
                            currentCursor = response.meta?.nextCursor;
                            hasNextPage = !!currentCursor;
                        } else if (mapping.pagination === 'offset') {
                            const hasMore = response.meta?.hasMore ?? items.length >= limit;
                            if (!hasMore) hasNextPage = false;
                        } else if (mapping.pagination === 'page') {
                            const lastPage = response.meta?.lastPage ?? currentPage;
                            if (currentPage > lastPage) hasNextPage = false;
                        }

                        // Save progress after each page in the batch
                        await this.prisma.refSyncProgress.upsert({
                            where: { mappingName: mapping.name },
                            update: {
                                offset: currentOffset,
                                page: currentPage,
                                cursor: currentCursor ?? null,
                                totalItems,
                                processedItems: totalProcessed,
                                status: 'RUNNING',
                                lastSyncAt: new Date(),
                            },
                            create: {
                                mappingName: mapping.name,
                                offset: currentOffset,
                                page: currentPage,
                                cursor: currentCursor ?? null,
                                totalItems,
                                processedItems: totalProcessed,
                                status: 'RUNNING',
                            }
                        });
                    } else {
                        totalProcessed += items.length;
                        if (mapping.pagination === 'cursor') {
                            currentCursor = response.meta?.nextCursor;
                            hasNextPage = !!currentCursor;
                        } else if (mapping.pagination === 'offset') {
                            const hasMore = response.meta?.hasMore ?? items.length >= limit;
                            if (!hasMore) hasNextPage = false;
                        }
                    }

                    const progressMsg = totalItems ? ` (${Math.round((totalProcessed / totalItems) * 100)}%)` : '';
                    this.logger.log(`Synced ${totalProcessed}${totalItems ? '/' + totalItems : ''} items for ${mapping.name}${progressMsg}`);
                }
            }

            if (!dryRun) {
                await this.prisma.refSyncProgress.update({
                    where: { mappingName: mapping.name },
                    data: {
                        status: 'COMPLETED',
                        lastSyncAt: new Date(),
                    }
                });
            }

            this.logger.log(`Successfully completed ${mapping.name} sync in ${Math.round((Date.now() - startTime) / 1000)}s`);
        } catch (error: any) {
            if (!dryRun) {
                await this.prisma.refSyncProgress.upsert({
                    where: { mappingName: mapping.name },
                    update: { status: 'FAILED', lastError: error.message },
                    create: { mappingName: mapping.name, status: 'FAILED', lastError: error.message }
                }).catch(() => { }); // Ignore error on status save
            }
            this.logger.error(`Failed to sync ${mapping.name}: ${error.message}`);
            throw error;
        }
    }

    private async upsertItems(modelName: string, uniqueField: string, items: any[]) {
        const model = (this.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        if (!model) {
            throw new Error(`Prisma model ${modelName} not found`);
        }

        await Promise.all(
            items.map((item) =>
                model.upsert({
                    where: { [uniqueField]: item[uniqueField] },
                    update: item,
                    create: item,
                }),
            ),
        );
    }

    private mapFields(item: any, mapping: JustTcgMapping) {
        const mapped: Record<string, any> = {};
        for (const fieldMapping of mapping.fields) {
            let value = fieldMapping.source === '*' ? item : item[fieldMapping.source];
            this.logger.log(`Mapping attempt: ${fieldMapping.source} -> ${fieldMapping.target}, source value: ${value !== undefined ? typeof value : 'undefined'}`);
            if (value !== undefined && value !== null) {
                if (fieldMapping.target === 'tcgplayerId') {
                    this.logger.log(`Mapping tcgplayerId: source=${fieldMapping.source}, value=${value}`);
                }
                switch (fieldMapping.transform) {
                    case 'number':
                        value = Number(value);
                        break;
                    case 'date':
                        value = new Date(value);
                        break;
                    case 'json':
                        value = typeof value === 'string' ? JSON.parse(value) : value;
                        break;
                    case 'string':
                        value = String(value);
                        break;
                }
                mapped[fieldMapping.target] = value;
            }
        }
        return mapped;
    }
}
