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
var CrawlOnePieceCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlOnePieceCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const pricecharting_ingest_service_1 = require("../pricecharting.ingest.service");
let CrawlOnePieceCommand = CrawlOnePieceCommand_1 = class CrawlOnePieceCommand extends nest_commander_1.CommandRunner {
    constructor(ingestService) {
        super();
        this.ingestService = ingestService;
        this.logger = new common_1.Logger(CrawlOnePieceCommand_1.name);
    }
    async run(passedParam, options) {
        try {
            this.logger.log('Starting PriceCharting One Piece crawl...');
            await this.ingestService.crawlOnePieceCards(options);
            this.logger.log('PriceCharting One Piece crawl finished.');
        }
        catch (e) {
            this.logger.error(`Crawl failed: ${e.message}`);
            process.exit(1);
        }
    }
    parseMaxProducts(val) {
        return parseInt(val, 10);
    }
    parseDryRun(val) {
        return val;
    }
    parseLinkRefProducts(val) {
        return val;
    }
    parseOnlySetSlug(val) {
        return val;
    }
    parseFresh(val) {
        return val;
    }
};
exports.CrawlOnePieceCommand = CrawlOnePieceCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-m, --maxProducts [number]',
        description: 'Limit number of products to crawl',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Number)
], CrawlOnePieceCommand.prototype, "parseMaxProducts", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-d, --dryRun',
        description: 'Dry run (no DB writes)',
        defaultValue: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], CrawlOnePieceCommand.prototype, "parseDryRun", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-l, --linkRefProducts',
        description: 'Link PriceCharting URL back to RefProduct based on TCGPlayerID',
        defaultValue: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], CrawlOnePieceCommand.prototype, "parseLinkRefProducts", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-s, --onlySetSlug [slug]',
        description: 'Only crawl a specific set slug (e.g. one-piece-500-years-in-the-future)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], CrawlOnePieceCommand.prototype, "parseOnlySetSlug", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-f, --fresh',
        description: 'Start a fresh sync (ignore previous progress)',
        defaultValue: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Boolean)
], CrawlOnePieceCommand.prototype, "parseFresh", null);
exports.CrawlOnePieceCommand = CrawlOnePieceCommand = CrawlOnePieceCommand_1 = __decorate([
    (0, nest_commander_1.Command)({ name: 'pricecharting:crawl:onepiece', description: 'Crawl PriceCharting One Piece catalog' }),
    __metadata("design:paramtypes", [pricecharting_ingest_service_1.PriceChartingIngestService])
], CrawlOnePieceCommand);
//# sourceMappingURL=pricecharting.commands.js.map