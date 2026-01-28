"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const https_proxy_agent_1 = require("https-proxy-agent");
const crypto = __importStar(require("crypto"));
let JustTcgClient = JustTcgClient_1 = class JustTcgClient {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(JustTcgClient_1.name);
        this.keyMetadata = new Map();
        this.currentKeyIndex = 0;
        this.baseUrl = this.configService.get('JUSTTCG_BASE_URL', 'https://api.justtcg.com');
        const rawKeys = this.configService.getOrThrow('JUSTTCG_API_KEY');
        this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
        if (this.apiKeys.length === 0) {
            throw new Error('JUSTTCG_API_KEY must contain at least one key');
        }
        const customerId = this.configService.get('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get('BRIGHTDATA_ZONE');
        const token = this.configService.get('BRIGHTDATA_TOKEN');
        for (const key of this.apiKeys) {
            let proxyAgent;
            if (customerId && zone && token) {
                const sessionId = crypto.createHash('md5').update(key).digest('hex').substring(0, 8);
                const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
                proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
                this.logger.debug(`Initialized BrightData proxy for key ${key.substring(0, 8)}... (Session: ${sessionId})`);
            }
            this.keyMetadata.set(key, {
                apiRequestLimit: 1000,
                apiDailyLimit: 100,
                apiRateLimit: 10,
                apiRequestsUsed: 0,
                apiDailyRequestsUsed: 0,
                apiRequestsRemaining: 10,
                apiDailyRequestsRemaining: 100,
                apiPlan: 'Unknown',
                lastUsed: 0,
                nextAvailableAt: 0,
                proxyAgent,
            });
        }
    }
    getNextApiKey() {
        const now = Date.now();
        let earliestWait = Infinity;
        for (let i = 0; i < this.apiKeys.length; i++) {
            const index = (this.currentKeyIndex + i) % this.apiKeys.length;
            const key = this.apiKeys[index];
            const meta = this.keyMetadata.get(key);
            if (meta.apiDailyRequestsRemaining > 0) {
                if (now >= meta.nextAvailableAt) {
                    this.currentKeyIndex = (index + 1) % this.apiKeys.length;
                    return key;
                }
                earliestWait = Math.min(earliestWait, meta.nextAvailableAt);
            }
        }
        if (earliestWait !== Infinity) {
            const waitMs = earliestWait - now;
            this.logger.warn(`All available keys are rate-limited. Next key ready in ${Math.ceil(waitMs / 1000)}s`);
            return this.apiKeys[this.currentKeyIndex];
        }
        throw new Error('All JustTCG API keys have exhausted their daily quota.');
    }
    updateMetadata(key, metadata) {
        if (!metadata)
            return;
        const current = this.keyMetadata.get(key);
        const isRateLimitWindowExhausted = metadata.apiRequestsUsed >= metadata.apiRateLimit;
        const isDailyQuotaExhausted = metadata.apiDailyRequestsRemaining <= 0;
        this.keyMetadata.set(key, {
            ...current,
            ...metadata,
            lastUsed: Date.now(),
            nextAvailableAt: isRateLimitWindowExhausted && !isDailyQuotaExhausted
                ? Date.now() + 61000
                : isDailyQuotaExhausted
                    ? Date.now() + (24 * 60 * 60 * 1000)
                    : 0,
        });
        const maskedKey = `${key.substring(0, 8)}...`;
        this.logger.log(`Key ${maskedKey} usage: daily ${metadata.apiDailyRequestsUsed}/${metadata.apiDailyLimit}, ` +
            `RPM window ${metadata.apiRequestsUsed}/${metadata.apiRateLimit} (${metadata.apiPlan})`);
        if (isRateLimitWindowExhausted && !isDailyQuotaExhausted) {
            this.logger.debug(`Key ${maskedKey} hit RPM limit (${metadata.apiRateLimit}). Will wait 60s or switch to another key.`);
        }
        if (isDailyQuotaExhausted) {
            this.logger.error(`Key ${maskedKey} DAILY QUOTA EXHAUSTED! ${metadata.apiDailyRequestsUsed}/${metadata.apiDailyLimit} used.`);
        }
        if (metadata.apiDailyRequestsRemaining < 10 && !isDailyQuotaExhausted) {
            this.logger.warn(`Key ${maskedKey} running low: ${metadata.apiDailyRequestsRemaining} daily requests remaining.`);
        }
    }
    async *fetchPages(mapping) {
        let page = 1;
        let offset = 0;
        let cursor;
        let hasNextPage = true;
        while (hasNextPage) {
            const response = await this.fetchPage(mapping, page, cursor, offset);
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
            const key = this.getNextApiKey();
            const meta = this.keyMetadata.get(key);
            const now = Date.now();
            if (now < meta.nextAvailableAt) {
                const waitMs = meta.nextAvailableAt - now;
                this.logger.log(`Waiting ${Math.ceil(waitMs / 1000)}s for key ${key.substring(0, 8)}... to replenish...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }
            try {
                const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(mapping.endpoint, {
                    baseURL: this.baseUrl,
                    params,
                    headers: {
                        'x-api-key': key,
                    },
                    httpsAgent: meta.proxyAgent,
                    proxy: false,
                    timeout: 10000,
                }));
                this.updateMetadata(key, data._metadata);
                return data;
            }
            catch (error) {
                attempt++;
                const status = error.response?.status;
                if (error.response?.data?._metadata) {
                    this.updateMetadata(key, error.response.data._metadata);
                }
                if (status === 401 || status === 403) {
                    this.logger.error(`Invalid or unauthorized API key: ${key.substring(0, 8)}...`);
                    const idx = this.apiKeys.indexOf(key);
                    if (idx > -1)
                        this.apiKeys.splice(idx, 1);
                    if (this.apiKeys.length === 0)
                        throw new Error('No valid API keys remaining');
                    continue;
                }
                const shouldRetry = attempt <= retries && (status === 429 || (status >= 500 && status <= 599));
                if (!shouldRetry) {
                    const errorData = error.response?.data;
                    const clearError = errorData?.message || error.message;
                    this.logger.error(`Failed to fetch ${mapping.endpoint} (${status}): ${clearError}` +
                        (errorData && !errorData.message ? ` - Response: ${JSON.stringify(errorData)}` : ''));
                    throw error;
                }
                if (status === 429) {
                    meta.nextAvailableAt = Date.now() + 61000;
                    this.logger.debug(`Key ${key.substring(0, 8)}... hit 429. Marked for 60s cooldown. Trying next key...`);
                    continue;
                }
                else {
                    const delay = Math.pow(2, attempt) * 2000;
                    this.logger.warn(`Retrying ${mapping.endpoint} (attempt ${attempt}) in ${delay}ms due to status ${status}...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
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