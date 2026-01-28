import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { JustTcgSyncService } from '../sync/justtcg.sync.service';

interface SyncOptions {
    only?: string;
    dryRun?: boolean;
    fresh?: boolean;
}

@Command({ name: 'justtcg:sync:dictionaries', description: 'Sync dictionaries from JustTCG' })
export class SyncDictionariesCommand extends CommandRunner {
    private readonly logger = new Logger(SyncDictionariesCommand.name);
    constructor(private readonly syncService: JustTcgSyncService) {
        super();
    }

    async run(passedParam: string[], options?: SyncOptions): Promise<void> {
        const only = options?.only ? options.only.split(',') : undefined;
        try {
            await this.syncService.syncDictionaries({ only, dryRun: options?.dryRun, fresh: options?.fresh });
        } catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }

    @Option({
        flags: '-o, --only [types]',
        description: 'Comma-separated list of dictionaries to sync (e.g. games,sets)',
    })
    parseOnly(val: string): string {
        return val;
    }

    @Option({
        flags: '-d, --dryRun',
        description: 'Dry run: fetch and map but do not write to DB',
    })
    parseDryRun(val: boolean): boolean {
        return val;
    }

    @Option({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    })
    parseFresh(val: boolean): boolean {
        return val;
    }
}

@Command({ name: 'justtcg:sync:catalog', description: 'Sync catalog (products) from JustTCG' })
export class SyncCatalogCommand extends CommandRunner {
    private readonly logger = new Logger(SyncCatalogCommand.name);
    constructor(private readonly syncService: JustTcgSyncService) {
        super();
    }

    async run(passedParam: string[], options?: SyncOptions): Promise<void> {
        try {
            await this.syncService.syncCatalog({ dryRun: options?.dryRun, fresh: options?.fresh });
        } catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }

    @Option({
        flags: '-d, --dryRun',
        description: 'Dry run: fetch and map but do not write to DB',
    })
    parseDryRun(val: boolean): boolean {
        return val;
    }

    @Option({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    })
    parseFresh(val: boolean): boolean {
        return val;
    }
}

@Command({ name: 'justtcg:sync:all', description: 'Sync everything from JustTCG' })
export class SyncAllCommand extends CommandRunner {
    private readonly logger = new Logger(SyncAllCommand.name);
    constructor(private readonly syncService: JustTcgSyncService) {
        super();
    }

    async run(passedParam: string[], options?: SyncOptions): Promise<void> {
        const only = options?.only ? options.only.split(',') : undefined;
        try {
            await this.syncService.syncAll({ only, dryRun: options?.dryRun, fresh: options?.fresh });
        } catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }

    @Option({
        flags: '-o, --only [types]',
        description: 'Comma-separated list of entities to sync',
    })
    parseOnly(val: string): string {
        return val;
    }

    @Option({
        flags: '-d, --dryRun',
        description: 'Dry run',
    })
    parseDryRun(val: boolean): boolean {
        return val;
    }

    @Option({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    })
    parseFresh(val: boolean): boolean {
        return val;
    }
}
