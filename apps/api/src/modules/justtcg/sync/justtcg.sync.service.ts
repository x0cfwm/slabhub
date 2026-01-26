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

    async syncAll(options: { only?: string[]; dryRun?: boolean } = {}) {
        const mappings = JUSTTCG_MAPPINGS.filter((m) => {
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });

        for (const mapping of mappings) {
            await this.syncMapping(mapping, options.dryRun);
        }
    }

    async syncDictionaries(options: { only?: string[]; dryRun?: boolean } = {}) {
        const mappings = JUSTTCG_MAPPINGS.filter((m) => {
            if (m.name === 'catalog') return false;
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });

        for (const mapping of mappings) {
            await this.syncMapping(mapping, options.dryRun);
        }
    }

    async syncCatalog(options: { dryRun?: boolean } = {}) {
        const mapping = JUSTTCG_MAPPINGS.find((m) => m.name === 'catalog');
        if (mapping) {
            await this.syncMapping(mapping, options.dryRun);
        }
    }

    private async syncMapping(mapping: JustTcgMapping, dryRun = false) {
        const startTime = Date.now();
        this.logger.log(`Starting sync for ${mapping.name}...`);

        let totalProcessed = 0;
        let totalItems: number | undefined;

        try {
            for await (const response of this.client.fetchPages(mapping)) {
                totalItems = response.meta?.total;
                const items = response.data;
                const mappedItems = items.map((item) => this.mapFields(item, mapping));

                if (dryRun) {
                    this.logger.log(`DRY RUN: Fetched ${items.length} items for ${mapping.name}`);
                    if (totalProcessed === 0 && mappedItems.length > 0) {
                        this.logger.log('Sample mapped item:', JSON.stringify(mappedItems[0], null, 2));
                    }
                } else {
                    await this.upsertItems(mapping.model, mapping.unique.targetField, mappedItems);
                }

                totalProcessed += items.length;
                const progress = totalItems ? ` (${Math.round((totalProcessed / totalItems) * 100)}%)` : '';
                this.logger.log(`Synced ${totalProcessed}${totalItems ? '/' + totalItems : ''} items for ${mapping.name}${progress}`);
            }

            this.logger.log(`Successfully completed ${mapping.name} sync in ${Math.round((Date.now() - startTime) / 1000)}s`);
        } catch (error: any) {
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
            let value = item[fieldMapping.source];
            if (value !== undefined && value !== null) {
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
