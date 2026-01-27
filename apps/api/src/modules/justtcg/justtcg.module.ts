import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JustTcgClient } from './justtcg.client';
import { JustTcgSyncService } from './sync/justtcg.sync.service';
import { SyncDictionariesCommand, SyncCatalogCommand, SyncAllCommand } from './cli/justtcg.commands';

@Module({
    imports: [HttpModule],
    providers: [
        JustTcgClient,
        JustTcgSyncService,
        SyncDictionariesCommand,
        SyncCatalogCommand,
        SyncAllCommand,
    ],
    exports: [JustTcgSyncService],
})
export class JustTcgModule { }
