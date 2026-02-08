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
var PriceChartingParser_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceChartingParser = void 0;
const common_1 = require("@nestjs/common");
const cheerio = __importStar(require("cheerio"));
const url_1 = require("./utils/url");
let PriceChartingParser = PriceChartingParser_1 = class PriceChartingParser {
    constructor() {
        this.logger = new common_1.Logger(PriceChartingParser_1.name);
    }
    parseCategoryPage(html, baseUrl) {
        const $ = cheerio.load(html);
        const setUrls = [];
        const container = $('#home-page, .full-width, body');
        container.find('a[href^="/console/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('one-piece') || href.includes('op0'))) {
                setUrls.push((0, url_1.canonicalizeUrl)(href, baseUrl));
            }
        });
        return [...new Set(setUrls)];
    }
    parseSetPage(html, baseUrl) {
        const $ = cheerio.load(html);
        const productUrls = [];
        const nextPages = [];
        $('a[href^="/game/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                const parts = href.split('/').filter(Boolean);
                if (parts.length >= 3) {
                    productUrls.push((0, url_1.canonicalizeUrl)(href, baseUrl));
                }
            }
        });
        $('.pagination a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('cursor=') || href.includes('page='))) {
                nextPages.push((0, url_1.canonicalizeUrl)(href, baseUrl));
            }
        });
        return {
            productUrls: [...new Set(productUrls)],
            nextPages: [...new Set(nextPages)],
        };
    }
    parseProductPage(html, url) {
        const $ = cheerio.load(html);
        const details = {};
        const detailsTable = $('.details table, table#details');
        detailsTable.find('tr').each((_, el) => {
            const key = $(el).find('td').first().text().trim().replace(/:$/, '');
            const value = $(el).find('td').last().text().trim();
            if (key) {
                details[key] = value.toLowerCase() === 'none' ? null : value;
            }
        });
        if (Object.keys(details).length === 0) {
            const text = $('body').text();
            const tcgMatch = text.match(/TCGPlayer ID:\s*(\d+)/i);
            if (tcgMatch)
                details['TCGPlayer ID'] = tcgMatch[1];
            const pcMatch = text.match(/PriceCharting ID:\s*(\d+)/i);
            if (pcMatch)
                details['PriceCharting ID'] = pcMatch[1];
            const cardNumMatch = text.match(/Card Number:\s*([^\n]+)/i);
            if (cardNumMatch)
                details['Card Number'] = cardNumMatch[1].trim();
        }
        const tcgPlayerIdStr = details['TCGPlayer ID'];
        const priceChartingIdStr = details['PriceCharting ID'];
        const cardNumber = details['Card Number'];
        const imageUrl = $('div.cover img').attr('src');
        const setName = $('.breadcrumbs a:last-of-type').text().trim();
        const h1Text = $('h1').text().trim();
        const productType = this.classifyProduct(h1Text);
        return {
            productUrl: url,
            tcgPlayerId: tcgPlayerIdStr ? parseInt(tcgPlayerIdStr, 10) : undefined,
            priceChartingId: priceChartingIdStr ? parseInt(priceChartingIdStr, 10) : undefined,
            cardNumber: cardNumber || undefined,
            details,
            setSlug: (0, url_1.extractSlug)(url, 'game'),
            setName: setName || undefined,
            productSlug: url.split('/').filter(Boolean).pop(),
            title: h1Text,
            imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.pricecharting.com${imageUrl}`) : undefined,
            productType,
            ...this.parsePricesFromTable($),
        };
    }
    parsePricesFromTable($) {
        const prices = {};
        const priceTable = $('#price_data, .price_details');
        if (priceTable.length === 0) {
            this.logger.warn('Price table not found on page');
            return prices;
        }
        const headers = [];
        priceTable.find('thead th').each((_, el) => {
            headers.push($(el).text().trim());
        });
        if (headers.length > 0) {
            priceTable.find('tbody tr').first().find('td').each((i, el) => {
                const label = headers[i];
                if (!label)
                    return;
                const priceText = $(el).find('span.price.js-price').first().text().trim() ||
                    $(el).find('.js-price').first().text().trim() ||
                    $(el).contents().first().text().trim();
                const price = this.parsePrice(priceText);
                if (price !== undefined) {
                    this.assignPriceByLabel(prices, label, price);
                }
            });
        }
        if (Object.keys(prices).length === 0) {
            priceTable.find('tr').each((_, el) => {
                const label = $(el).find('td, th').first().text().trim();
                const priceText = $(el).find('span.price.js-price').first().text().trim() ||
                    $(el).find('.price.js-price').first().text().trim() ||
                    $(el).find('td.price').first().text().trim();
                const price = this.parsePrice(priceText);
                if (price !== undefined) {
                    this.assignPriceByLabel(prices, label, price);
                }
            });
        }
        this.logger.debug(`Extracted prices to object: ${JSON.stringify(prices)}`);
        return prices;
    }
    assignPriceByLabel(prices, label, price) {
        if (label.includes('Ungraded')) {
            prices.rawPrice = price;
        }
        else if (label.includes('Grade 7')) {
            prices.grade7Price = price;
        }
        else if (label.includes('Grade 8')) {
            prices.grade8Price = price;
        }
        else if (label.includes('Grade 9.5')) {
            prices.grade95Price = price;
        }
        else if (label.includes('Grade 9')) {
            prices.grade9Price = price;
        }
        else if (label.includes('PSA 10') || label.includes('Grade 10')) {
            prices.grade10Price = price;
        }
        else if (label.includes('New') || label.includes('Sealed')) {
            prices.sealedPrice = price;
        }
    }
    parsePrice(text) {
        if (!text || text.trim() === '-' || text.trim() === '')
            return undefined;
        const cleaned = text.replace(/[$,]/g, '').trim();
        const price = parseFloat(cleaned);
        return isNaN(price) ? undefined : price;
    }
    classifyProduct(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('booster box') || lowerTitle.includes('24 packs') || lowerTitle.includes('display box')) {
            return 'SEALED_BOX';
        }
        if (lowerTitle.includes('booster pack')) {
            return 'SEALED_PACK';
        }
        if (lowerTitle.includes('deck') ||
            lowerTitle.includes('collection') ||
            lowerTitle.includes('gift set') ||
            lowerTitle.includes('box set') ||
            lowerTitle.includes('double pack') ||
            lowerTitle.includes('case') ||
            lowerTitle.includes('sleeves') ||
            lowerTitle.includes('playmat')) {
            return 'SEALED_OTHER';
        }
        return 'SINGLE_CARD';
    }
};
exports.PriceChartingParser = PriceChartingParser;
exports.PriceChartingParser = PriceChartingParser = PriceChartingParser_1 = __decorate([
    (0, common_1.Injectable)()
], PriceChartingParser);
//# sourceMappingURL=pricecharting.parser.js.map