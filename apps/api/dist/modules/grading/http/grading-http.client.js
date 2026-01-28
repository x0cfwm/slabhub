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
var GradingHttpClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingHttpClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const https_proxy_agent_1 = require("https-proxy-agent");
let GradingHttpClient = GradingHttpClient_1 = class GradingHttpClient {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(GradingHttpClient_1.name);
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const customerId = this.configService.get('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get('BRIGHTDATA_ZONE');
        const token = this.configService.get('BRIGHTDATA_TOKEN');
        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for Grading HTTP client (Session: ${sessionId})`);
        }
    }
    async fetchPsaCert(certNumber) {
        const token = this.configService.get('PSA_API_TOKEN');
        const url = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                httpsAgent: this.proxyAgent,
                proxy: false,
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            this.handleAxiosError(error, url);
        }
    }
    async fetchBgsPage(certNumber) {
        throw new common_1.HttpException('BGS lookup not implemented', common_1.HttpStatus.NOT_IMPLEMENTED);
    }
    handleAxiosError(error, url) {
        if (error.response) {
            if (error.response.status === 404) {
                throw new common_1.HttpException('Certificate not found on PSA API', common_1.HttpStatus.NOT_FOUND);
            }
            if (error.response.status === 401 || error.response.status === 403) {
                throw new common_1.HttpException('PSA API Authentication failed or forbidden', common_1.HttpStatus.FORBIDDEN);
            }
            if (error.response.status === 429) {
                throw new common_1.HttpException('PSA API rate limited our request', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            this.logger.error(`Error fetching ${url}: ${error.response.status} ${error.response.statusText}`);
            throw new common_1.HttpException(`Upstream error: ${error.response.status}`, common_1.HttpStatus.BAD_GATEWAY);
        }
        this.logger.error(`Network error fetching ${url}: ${error.message}`);
        throw new common_1.HttpException('Network or timeout error while fetching PSA API', common_1.HttpStatus.BAD_GATEWAY);
    }
};
exports.GradingHttpClient = GradingHttpClient;
exports.GradingHttpClient = GradingHttpClient = GradingHttpClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], GradingHttpClient);
//# sourceMappingURL=grading-http.client.js.map