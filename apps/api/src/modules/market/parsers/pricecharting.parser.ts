import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface PriceChartingEntry {
    date: string;
    title: string;
    price: number;
    source: 'eBay' | 'TCGPlayer' | 'Unknown';
    link?: string;
}

export interface PriceChartingSummary {
    ungraded?: number;
    grade7?: number;
    grade8?: number;
    grade9?: number;
    grade95?: number;
    psa10?: number;
}

export interface PriceChartingResponse {
    summary: PriceChartingSummary;
    sales: PriceChartingEntry[];
}

@Injectable()
export class PriceChartingParser {
    private readonly logger = new Logger(PriceChartingParser.name);
    private readonly userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    private readonly proxyAgent?: HttpsProxyAgent<string>;

    constructor(private readonly configService: ConfigService) {
        // Disable TLS verification to handle residential proxy SSL interception
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const customerId = this.configService.get<string>('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get<string>('BRIGHTDATA_ZONE');
        const token = this.configService.get<string>('BRIGHTDATA_TOKEN');

        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for PriceCharting parsing (Session: ${sessionId})`);
        }
    }

    async parse(url: string): Promise<PriceChartingResponse> {
        try {
            this.logger.log(`Fetching PriceCharting data from: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                httpsAgent: this.proxyAgent,
                proxy: false,
                timeout: 30000, // Increased timeout for proxy
            });

            const $ = cheerio.load(response.data);
            const sales: PriceChartingEntry[] = [];

            // 1. Extract Summary Prices
            const summary: PriceChartingSummary = {
                ungraded: this.parsePrice($('#used_price span.price').text()),
                grade7: this.parsePrice($('#complete_price span.price').text()),
                grade8: this.parsePrice($('#new_price span.price').text()),
                grade9: this.parsePrice($('#graded_price span.price').text()),
                grade95: this.parsePrice($('#box_only_price span.price').text()),
                psa10: this.parsePrice($('#manual_only_price span.price').text()),
            };

            // 2. Extract Sales
            let table = $('#completed_sales_table');
            if (table.length === 0) {
                table = $('.js-completed-sales-table');
            }

            if (table.length === 0) {
                // Fallback: Find table that contains "Date" and "Price" headers
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
                // Try to find ANY rows that look like sales if table finding failed
                const anyRows = $('tr').filter((i: number, el: any) => {
                    const text = $(el).text();
                    return text.includes('$') && /\d{4}-\d{2}-\d{2}/.test(text);
                });
                if (anyRows.length > 0) {
                    this.logger.log(`Found ${anyRows.length} rows using pattern fallback`);
                    this.processRows($, anyRows, sales);
                }
            } else {
                this.processRows($, rows, sales);
            }

            if (sales.length === 0 && !summary.ungraded) {
                throw new Error('No entries could be parsed from the page structure.');
            }

            return { summary, sales };
        } catch (error) {
            this.logger.error(`Failed to parse PriceCharting URL ${url}: ${error.message}`);
            throw error;
        }
    }

    private processRows($: cheerio.CheerioAPI, rows: cheerio.Cheerio<any>, entries: PriceChartingEntry[]) {
        rows.each((i: number, el: any) => {
            if (entries.length >= 20) return false; // Increased to 20 sales

            const dateTd = $(el).find('td.date');
            const titleTd = $(el).find('td.title');
            const priceTd = $(el).find('td.price, td.numeric');

            const dateStr = dateTd.text().trim();
            const titleLink = titleTd.find('a');
            const titleText = titleLink.text().trim();
            const fullTitleCellText = titleTd.text().trim();
            const link = titleLink.attr('href');

            // Price can be in a span with .js-price or directly in .numeric
            let priceStr = priceTd.find('.js-price').text().trim();
            if (!priceStr) {
                priceStr = priceTd.text().trim();
            }

            if (!dateStr || !titleText || !priceStr) return;

            const price = this.parsePrice(priceStr);
            if (price === undefined) return;

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

    private parsePrice(priceStr: string): number | undefined {
        if (!priceStr) return undefined;
        // Remove currency symbols and commas
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? undefined : val;
    }

    private normalizeDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    private inferSource(text: string): 'eBay' | 'TCGPlayer' | 'Unknown' {
        const lower = text.toLowerCase();
        if (lower.includes('ebay')) return 'eBay';
        if (lower.includes('tcgplayer')) return 'TCGPlayer';
        return 'Unknown';
    }
}
