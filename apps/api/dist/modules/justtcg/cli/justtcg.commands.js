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
var SyncDictionariesCommand_1, SyncCatalogCommand_1, SyncAllCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncAllCommand = exports.SyncCatalogCommand = exports.SyncDictionariesCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const justtcg_sync_service_1 = require("../sync/justtcg.sync.service");
let SyncDictionariesCommand = SyncDictionariesCommand_1 = class SyncDictionariesCommand extends nest_commander_1.CommandRunner {
    constructor(syncService) {
        super();
        this.syncService = syncService;
        this.logger = new common_1.Logger(SyncDictionariesCommand_1.name);
    }
    async run(passedParam, options) {
        const only = options?.only ? options.only.split(',') : undefined;
        try {
            await this.syncService.syncDictionaries({ only, dryRun: options?.dryRun, fresh: options?.fresh });
        }
        catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }
    parseOnly(val) {
        return val;
    }
    parseDryRun(val) {
        return val;
    }
    parseFresh(val) {
        return val;
    }
};
exports.SyncDictionariesCommand = SyncDictionariesCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-o, --only [types]',
        description: 'Comma-separated list of dictionaries to sync (e.g. games,sets)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], SyncDictionariesCommand.prototype, "parseOnly", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-d, --dryRun',
        description: 'Dry run: fetch and map but do not write to DB',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncDictionariesCommand.prototype, "parseDryRun", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncDictionariesCommand.prototype, "parseFresh", null);
exports.SyncDictionariesCommand = SyncDictionariesCommand = SyncDictionariesCommand_1 = __decorate([
    (0, nest_commander_1.Command)({ name: 'justtcg:sync:dictionaries', description: 'Sync dictionaries from JustTCG' }),
    __metadata("design:paramtypes", [justtcg_sync_service_1.JustTcgSyncService])
], SyncDictionariesCommand);
let SyncCatalogCommand = SyncCatalogCommand_1 = class SyncCatalogCommand extends nest_commander_1.CommandRunner {
    constructor(syncService) {
        super();
        this.syncService = syncService;
        this.logger = new common_1.Logger(SyncCatalogCommand_1.name);
    }
    async run(passedParam, options) {
        try {
            await this.syncService.syncCatalog({ dryRun: options?.dryRun, fresh: options?.fresh });
        }
        catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }
    parseDryRun(val) {
        return val;
    }
    parseFresh(val) {
        return val;
    }
};
exports.SyncCatalogCommand = SyncCatalogCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-d, --dryRun',
        description: 'Dry run: fetch and map but do not write to DB',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncCatalogCommand.prototype, "parseDryRun", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncCatalogCommand.prototype, "parseFresh", null);
exports.SyncCatalogCommand = SyncCatalogCommand = SyncCatalogCommand_1 = __decorate([
    (0, nest_commander_1.Command)({ name: 'justtcg:sync:catalog', description: 'Sync catalog (products) from JustTCG' }),
    __metadata("design:paramtypes", [justtcg_sync_service_1.JustTcgSyncService])
], SyncCatalogCommand);
let SyncAllCommand = SyncAllCommand_1 = class SyncAllCommand extends nest_commander_1.CommandRunner {
    constructor(syncService) {
        super();
        this.syncService = syncService;
        this.logger = new common_1.Logger(SyncAllCommand_1.name);
    }
    async run(passedParam, options) {
        const only = options?.only ? options.only.split(',') : undefined;
        try {
            await this.syncService.syncAll({ only, dryRun: options?.dryRun, fresh: options?.fresh });
        }
        catch (e) {
            this.logger.error('Sync failed');
            process.exit(1);
        }
    }
    parseOnly(val) {
        return val;
    }
    parseDryRun(val) {
        return val;
    }
    parseFresh(val) {
        return val;
    }
};
exports.SyncAllCommand = SyncAllCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-o, --only [types]',
        description: 'Comma-separated list of entities to sync',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], SyncAllCommand.prototype, "parseOnly", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-d, --dryRun',
        description: 'Dry run',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncAllCommand.prototype, "parseDryRun", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-f, --fresh',
        description: 'Restart sync from the beginning (ignore saved progress)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], SyncAllCommand.prototype, "parseFresh", null);
exports.SyncAllCommand = SyncAllCommand = SyncAllCommand_1 = __decorate([
    (0, nest_commander_1.Command)({ name: 'justtcg:sync:all', description: 'Sync everything from JustTCG' }),
    __metadata("design:paramtypes", [justtcg_sync_service_1.JustTcgSyncService])
], SyncAllCommand);
//# sourceMappingURL=justtcg.commands.js.map