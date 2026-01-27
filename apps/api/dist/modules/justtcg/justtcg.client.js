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
var JustTcgClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JustTcgClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let JustTcgClient = JustTcgClient_1 = class JustTcgClient {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(JustTcgClient_1.name);
        this.currentKeyIndex = 0;
        this.baseUrl = this.configService.get('JUSTTCG_BASE_URL', 'https://api.justtcg.com');
        const rawKeys = this.configService.getOrThrow('JUSTTCG_API_KEY');
        this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
        if (this.apiKeys.length === 0) {
            throw new Error('JUSTTCG_API_KEY must contain at least one key');
        }
    }
    getNextApiKey() {
        const key = this.apiKeys[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return key;
    }
    async *fetchPages(mapping) {
        let page = 1;
        let offset = 0;
        let cursor;
        let hasNextPage = true;
        let requestCount = 0;
        while (hasNextPage) {
            if (requestCount > 0) {
                const rpmDelay = Math.ceil(6100 / this.apiKeys.length);
                this.logger.log(`Rate limiting: waiting ${rpmDelay}ms before next request (using ${this.apiKeys.length} keys)...`);
                await new Promise((resolve) => setTimeout(resolve, rpmDelay));
            }
            const response = await this.fetchPage(mapping, page, cursor, offset);
            requestCount++;
            yield response;
            if (mapping.pagination === 'none') {
                hasNextPage = false;
            }
            else if (mapping.pagination === 'page') {
                const lastPage = response.meta?.lastPage ?? 1;
                if (page >= lastPage) {
                    hasNextPage = false;
                }
                else {
                    page++;
                }
            }
            else if (mapping.pagination === 'cursor') {
                cursor = response.meta?.nextCursor;
                hasNextPage = !!cursor;
            }
            else if (mapping.pagination === 'offset') {
                if (response.meta?.hasMore) {
                    offset += (mapping.limit ?? 20);
                    hasNextPage = true;
                }
                else {
                    hasNextPage = false;
                }
            }
        }
    }
    async fetchAll(mapping) {
        const allItems = [];
        for await (const response of this.fetchPages(mapping)) {
            allItems.push(...response.data);
        }
        return allItems;
    }
    async fetchPage(mapping, page, cursor, offset) {
        const params = { limit: mapping.limit ?? 20, ...mapping.params };
        if (mapping.pagination === 'page') {
            params.page = page;
        }
        else if (mapping.pagination === 'cursor' && cursor) {
            params.cursor = cursor;
        }
        else if (mapping.pagination === 'offset' && offset !== undefined) {
            params.offset = offset;
        }
        const retries = 5;
        let attempt = 0;
        while (attempt <= retries) {
            try {
                const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(mapping.endpoint, {
                    baseURL: this.baseUrl,
                    params,
                    headers: {
                        'x-api-key': this.getNextApiKey(),
                    },
                    timeout: 10000,
                }));
                return data;
            }
            catch (error) {
                attempt++;
                const status = error.response?.status;
                const shouldRetry = attempt <= retries && (status === 429 || (status >= 500 && status <= 599));
                if (!shouldRetry) {
                    const errorData = error.response?.data;
                    this.logger.error(`Failed to fetch ${mapping.endpoint} after ${attempt} attempts: ${error.message}${errorData ? ' - Response: ' + JSON.stringify(errorData) : ''}`);
                    throw error;
                }
                const baseDelay = status === 429 ? 30000 : 2000;
                const delay = Math.pow(2, attempt) * baseDelay;
                this.logger.warn(`Retrying ${mapping.endpoint} (attempt ${attempt}) in ${delay}ms due to status ${status}...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error(`Failed to fetch ${mapping.endpoint} after ${retries} retries`);
    }
};
exports.JustTcgClient = JustTcgClient;
exports.JustTcgClient = JustTcgClient = JustTcgClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], JustTcgClient);
//# sourceMappingURL=justtcg.client.js.map