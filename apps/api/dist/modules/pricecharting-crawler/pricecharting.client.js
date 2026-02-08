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
var PriceChartingClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const axios_2 = require("axios");
const https_proxy_agent_1 = require("https-proxy-agent");
let PriceChartingClient = PriceChartingClient_1 = class PriceChartingClient {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(PriceChartingClient_1.name);
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const customerId = this.configService.get('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get('BRIGHTDATA_ZONE');
        const token = this.configService.get('BRIGHTDATA_TOKEN');
        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for PriceCharting crawling (Session: ${sessionId})`);
        }
    }
    async fetch(url, retries = 3) {
        await this.rateLimit();
        try {
            this.logger.debug(`Fetching ${url}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                },
                httpsAgent: this.proxyAgent,
                proxy: false,
                timeout: 30000,
            }));
            this.lastRequestTime = Date.now();
            return response.data;
        }
        catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                const delay = Math.pow(2, 4 - retries) * 1000;
                this.logger.warn(`Retry fetching ${url} in ${delay}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.fetch(url, retries - 1);
            }
            this.logger.error(`Failed to fetch ${url}: ${error.message}`);
            throw error;
        }
    }
    async fetchBinary(url, retries = 3) {
        await this.rateLimit();
        try {
            this.logger.debug(`Fetching binary content from ${url}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                httpsAgent: this.proxyAgent,
                proxy: false,
                timeout: 30000,
                responseType: 'arraybuffer',
            }));
            this.lastRequestTime = Date.now();
            return Buffer.from(response.data);
        }
        catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                const delay = Math.pow(2, 4 - retries) * 1000;
                this.logger.warn(`Retry fetching binary ${url} in ${delay}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.fetchBinary(url, retries - 1);
            }
            this.logger.error(`Failed to fetch binary ${url}: ${error.message}`);
            throw error;
        }
    }
    async rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minRequestInterval) {
            const wait = this.minRequestInterval - elapsed;
            await new Promise((resolve) => setTimeout(resolve, wait));
        }
    }
    shouldRetry(error) {
        if (error instanceof axios_2.AxiosError) {
            const status = error.response?.status;
            return !status || status === 429 || (status >= 500 && status < 600);
        }
        return true;
    }
};
exports.PriceChartingClient = PriceChartingClient;
exports.PriceChartingClient = PriceChartingClient = PriceChartingClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], PriceChartingClient);
//# sourceMappingURL=pricecharting.client.js.map