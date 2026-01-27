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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PriceChartingParser_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingParser = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
let PriceChartingParser = PriceChartingParser_1 = class PriceChartingParser {
    constructor() {
        this.logger = new common_1.Logger(PriceChartingParser_1.name);
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
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
                timeout: 10000,
            });
            const $ = cheerio.load(response.data);
            const entries = [];
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
                    this.processRows($, anyRows, entries);
                }
            }
            else {
                this.processRows($, rows, entries);
            }
            if (entries.length === 0) {
                throw new Error('No entries could be parsed from the page structure.');
            }
            return entries;
        }
        catch (error) {
            this.logger.error(`Failed to parse PriceCharting URL ${url}: ${error.message}`);
            throw error;
        }
    }
    processRows($, rows, entries) {
        rows.each((i, el) => {
            if (entries.length >= 10)
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
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        return parseFloat(cleaned) || 0;
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
    (0, common_1.Injectable)()
], PriceChartingParser);
//# sourceMappingURL=pricecharting.parser.js.map