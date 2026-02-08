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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PriceChartingParser_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingParser = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const https_proxy_agent_1 = require("https-proxy-agent");
let PriceChartingParser = PriceChartingParser_1 = class PriceChartingParser {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PriceChartingParser_1.name);
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const customerId = this.configService.get('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get('BRIGHTDATA_ZONE');
        const token = this.configService.get('BRIGHTDATA_TOKEN');
        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for PriceCharting parsing (Session: ${sessionId})`);
        }
    }
    async parse(url) {
        try {
            this.logger.log(`Fetching PriceCharting data from: ${url}`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                httpsAgent: this.proxyAgent,
                proxy: false,
                timeout: 30000,
            });
            const $ = cheerio.load(response.data);
            const sales = [];
            const summary = {
                ungraded: this.parsePrice($('#used_price span.price').text()),
                grade7: this.parsePrice($('#complete_price span.price').text()),
                grade8: this.parsePrice($('#new_price span.price').text()),
                grade9: this.parsePrice($('#graded_price span.price').text()),
                grade95: this.parsePrice($('#box_only_price span.price').text()),
                psa10: this.parsePrice($('#manual_only_price span.price').text()),
            };
            let table = $('#completed_sales_table');
            if (table.length === 0) {
                table = $('.js-completed-sales-table');
            }
            if (table.length === 0) {
                $('table').each((i, el) => {
                    const text = $(el).text();
                    if (text.includes('Date') && text.includes('Price') && (text.includes('Title') || text.includes('Sale'))) {
                        table = $(el);
                        return false;
                    }
                });
            }
            const rows = table.find('tbody tr');
            if (rows.length === 0) {
                this.logger.warn(`No sales rows found for ${url}`);
                const anyRows = $('tr').filter((i, el) => {
                    const text = $(el).text();
                    return text.includes('$') && /\d{4}-\d{2}-\d{2}/.test(text);
                });
                if (anyRows.length > 0) {
                    this.logger.log(`Found ${anyRows.length} rows using pattern fallback`);
                    this.processRows($, anyRows, sales);
                }
            }
            else {
                this.processRows($, rows, sales);
            }
            if (sales.length === 0 && !summary.ungraded) {
                throw new Error('No entries could be parsed from the page structure.');
            }
            return { summary, sales };
        }
        catch (error) {
            this.logger.error(`Failed to parse PriceCharting URL ${url}: ${error.message}`);
            throw error;
        }
    }
    processRows($, rows, entries) {
        rows.each((i, el) => {
            if (entries.length >= 20)
                return false;
            const dateTd = $(el).find('td.date');
            const titleTd = $(el).find('td.title');
            const priceTd = $(el).find('td.price, td.numeric');
            const dateStr = dateTd.text().trim();
            const titleLink = titleTd.find('a');
            const titleText = titleLink.text().trim();
            const fullTitleCellText = titleTd.text().trim();
            const link = titleLink.attr('href');
            let priceStr = priceTd.find('.js-price').text().trim();
            if (!priceStr) {
                priceStr = priceTd.text().trim();
            }
            if (!dateStr || !titleText || !priceStr)
                return;
            const price = this.parsePrice(priceStr);
            if (price === undefined)
                return;
            const date = this.normalizeDate(dateStr);
            const source = this.inferSource(fullTitleCellText);
            entries.push({
                date,
                title: titleText,
                price,
                source,
                link: link ? (link.startsWith('http') ? link : `https://www.pricecharting.com${link}`) : undefined,
            });
        });
    }
    parsePrice(priceStr) {
        if (!priceStr)
            return undefined;
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? undefined : val;
    }
    normalizeDate(dateStr) {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime()))
                return dateStr;
            return d.toISOString().split('T')[0];
        }
        catch {
            return dateStr;
        }
    }
    inferSource(text) {
        const lower = text.toLowerCase();
        if (lower.includes('ebay'))
            return 'eBay';
        if (lower.includes('tcgplayer'))
            return 'TCGPlayer';
        return 'Unknown';
    }
};
exports.PriceChartingParser = PriceChartingParser;
exports.PriceChartingParser = PriceChartingParser = PriceChartingParser_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PriceChartingParser);
//# sourceMappingURL=pricecharting.parser.js.map