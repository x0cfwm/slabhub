import { CommandRunner } from 'nest-commander';
import { JustTcgSyncService } from '../sync/justtcg.sync.service';
interface SyncOptions {
    only?: string;
    dryRun?: boolean;
}
export declare class SyncDictionariesCommand extends CommandRunner {
    private readonly syncService;
    private readonly logger;
    constructor(syncService: JustTcgSyncService);
    run(passedParam: string[], options?: SyncOptions): Promise<void>;
    parseOnly(val: string): string;
    parseDryRun(val: boolean): boolean;
}
export declare class SyncCatalogCommand extends CommandRunner {
    private readonly syncService;
    private readonly logger;
    constructor(syncService: JustTcgSyncService);
    run(passedParam: string[], options?: SyncOptions): Promise<void>;
    parseDryRun(val: boolean): boolean;
}
export declare class SyncAllCommand extends CommandRunner {
    private readonly syncService;
    private readonly logger;
    constructor(syncService: JustTcgSyncService);
    run(passedParam: string[], options?: SyncOptions): Promise<void>;
    parseOnly(val: string): string;
    parseDryRun(val: boolean): boolean;
}
export {};
