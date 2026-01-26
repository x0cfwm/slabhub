import { PrismaService } from '../../prisma/prisma.service';
import { JustTcgClient } from '../justtcg.client';
export declare class JustTcgSyncService {
    private readonly client;
    private readonly prisma;
    private readonly logger;
    constructor(client: JustTcgClient, prisma: PrismaService);
    syncAll(options?: {
        only?: string[];
        dryRun?: boolean;
    }): Promise<void>;
    syncDictionaries(options?: {
        only?: string[];
        dryRun?: boolean;
    }): Promise<void>;
    syncCatalog(options?: {
        dryRun?: boolean;
    }): Promise<void>;
    private syncMapping;
    private upsertItems;
    private mapFields;
}
