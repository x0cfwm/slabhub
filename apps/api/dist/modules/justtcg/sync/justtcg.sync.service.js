"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JustTcgSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JustTcgSyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const justtcg_client_1 = require("../justtcg.client");
const justtcg_mappings_1 = require("../justtcg.mappings");
let JustTcgSyncService = JustTcgSyncService_1 = class JustTcgSyncService {
    constructor(client, prisma) {
        this.client = client;
        this.prisma = prisma;
        this.logger = new common_1.Logger(JustTcgSyncService_1.name);
    }
    async syncAll(options = {}) {
        const mappings = justtcg_mappings_1.JUSTTCG_MAPPINGS.filter((m) => {
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });
        for (const mapping of mappings) {
            await this.syncMapping(mapping, options);
        }
    }
    async syncDictionaries(options = {}) {
        const mappings = justtcg_mappings_1.JUSTTCG_MAPPINGS.filter((m) => {
            if (m.name === 'catalog')
                return false;
            if (options.only && options.only.length > 0) {
                return options.only.includes(m.name);
            }
            return true;
        });
        for (const mapping of mappings) {
            await this.syncMapping(mapping, options);
        }
    }
    async syncCatalog(options = {}) {
        const mapping = justtcg_mappings_1.JUSTTCG_MAPPINGS.find((m) => m.name === 'catalog');
        if (mapping) {
            await this.syncMapping(mapping, options);
        }
    }
    async syncMapping(mapping, options = {}) {
        const { dryRun = false, fresh = false } = options;
        const startTime = Date.now();
        let progress = await this.prisma.refSyncProgress.findUnique({
            where: { mappingName: mapping.name }
        });
        if (progress && (fresh || progress.status === 'COMPLETED')) {
            this.logger.log(`${fresh ? 'Fresh sync requested' : 'Previous sync was completed'}. Resetting progress for ${mapping.name}...`);
            await this.prisma.refSyncProgress.delete({ where: { mappingName: mapping.name } });
            progress = null;
        }
        let currentOffset = progress?.offset ?? 0;
        let currentPage = progress?.page ?? 1;
        let currentCursor = progress?.cursor ?? undefined;
        let totalProcessed = progress?.processedItems ?? 0;
        let totalItems = progress?.totalItems ?? undefined;
        this.logger.log(`Starting sync for ${mapping.name}... ${progress ? `(Resuming from ${mapping.pagination === 'offset' ? 'offset ' + currentOffset : 'page ' + currentPage})` : '(Fresh Start)'}`);
        try {
            const fetchOptions = {
                startOffset: currentOffset,
                startPage: currentPage,
                startCursor: currentCursor
            };
            for await (const response of this.client.fetchPages(mapping, fetchOptions)) {
                totalItems = response.meta?.total;
                const items = response.data;
                const mappedItems = items.map((item) => this.mapFields(item, mapping));
                if (!dryRun) {
                    await this.upsertItems(mapping.model, mapping.unique.targetField, mappedItems);
                    totalProcessed += items.length;
                    if (mapping.pagination === 'offset') {
                        currentOffset += items.length;
                    }
                    else if (mapping.pagination === 'page') {
                        currentPage++;
                    }
                    else if (mapping.pagination === 'cursor') {
                        currentCursor = response.meta?.nextCursor;
                    }
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
                }
                else {
                    totalProcessed += items.length;
                }
                const progressMsg = totalItems ? ` (${Math.round((totalProcessed / totalItems) * 100)}%)` : '';
                this.logger.log(`Synced ${totalProcessed}${totalItems ? '/' + totalItems : ''} items for ${mapping.name}${progressMsg}`);
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
        }
        catch (error) {
            if (!dryRun) {
                await this.prisma.refSyncProgress.upsert({
                    where: { mappingName: mapping.name },
                    update: { status: 'FAILED', lastError: error.message },
                    create: { mappingName: mapping.name, status: 'FAILED', lastError: error.message }
                }).catch(() => { });
            }
            this.logger.error(`Failed to sync ${mapping.name}: ${error.message}`);
            throw error;
        }
    }
    async upsertItems(modelName, uniqueField, items) {
        const model = this.prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        if (!model) {
            throw new Error(`Prisma model ${modelName} not found`);
        }
        await Promise.all(items.map((item) => model.upsert({
            where: { [uniqueField]: item[uniqueField] },
            update: item,
            create: item,
        })));
    }
    mapFields(item, mapping) {
        const mapped = {};
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
};
exports.JustTcgSyncService = JustTcgSyncService;
exports.JustTcgSyncService = JustTcgSyncService = JustTcgSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [justtcg_client_1.JustTcgClient,
        prisma_service_1.PrismaService])
], JustTcgSyncService);
//# sourceMappingURL=justtcg.sync.service.js.map