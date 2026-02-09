import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ParsedProductDetails, PriceChartingProductType } from './types';
import { canonicalizeUrl, extractSlug } from './utils/url';

@Injectable()
export class PriceChartingParser {
    private readonly logger = new Logger(PriceChartingParser.name);

    parseCategoryPage(html: string, baseUrl: string): string[] {
        const $ = cheerio.load(html);
        const setUrls: string[] = [];

        // The main content area usually has id #home-page or is the main container
        const container = $('#home-page, .full-width, body');

        // Set links look like /console/<slug>
        container.find('a[href^="/console/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('one-piece') || href.includes('op0'))) {
                setUrls.push(canonicalizeUrl(href, baseUrl));
            }
        });

        return [...new Set(setUrls)];
    }

    parseSetPage(html: string, baseUrl: string): { productUrls: string[]; nextPages: string[] } {
        const $ = cheerio.load(html);
        const productUrls: string[] = [];
        const nextPages: string[] = [];

        // Product links look like /game/<set-slug>/<product-slug>
        $('a[href^="/game/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                // Ensure it's not a generic /game/ link but has at least 2 parts after /game/
                const parts = href.split('/').filter(Boolean);
                if (parts.length >= 3) { // /game/set-slug/product-slug
                    productUrls.push(canonicalizeUrl(href, baseUrl));
                }
            }
        });

        // Pagination
        $('.pagination a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('cursor=') || href.includes('page='))) {
                nextPages.push(canonicalizeUrl(href, baseUrl));
            }
        });

        return {
            productUrls: [...new Set(productUrls)],
            nextPages: [...new Set(nextPages)],
        };
    }

    parseProductPage(html: string, url: string): ParsedProductDetails {
        const $ = cheerio.load(html);
        const details: Record<string, string | null> = {};

        // Find the "Details" block
        const detailsTable = $('.details table, table#details');

        detailsTable.find('tr').each((_, el) => {
            const key = $(el).find('td').first().text().trim().replace(/:$/, '');
            const value = $(el).find('td').last().text().trim();
            if (key) {
                details[key] = value.toLowerCase() === 'none' ? null : value;
            }
        });

        // Fallback parsing if table not found or incomplete
        if (Object.keys(details).length === 0) {
            const text = $('body').text();
            const tcgMatch = text.match(/TCGPlayer ID:\s*(\d+)/i);
            if (tcgMatch) details['TCGPlayer ID'] = tcgMatch[1];

            const pcMatch = text.match(/PriceCharting ID:\s*(\d+)/i);
            if (pcMatch) details['PriceCharting ID'] = pcMatch[1];

            const cardNumMatch = text.match(/Card Number:\s*([^\n]+)/i);
            if (cardNumMatch) details['Card Number'] = cardNumMatch[1].trim();
        }

        const tcgPlayerIdStr = details['TCGPlayer ID'];
        const priceChartingIdStr = details['PriceCharting ID'];
        const cardNumber = details['Card Number'];

        // Extract Image
        const imageUrl = $('div.cover img').attr('src');

        // Extract Set Name
        const setName = $('.breadcrumbs a:last-of-type').text().trim();

        // Extract Product Title for classification
        const h1Text = $('h1').text().trim();
        const productType = this.classifyProduct(h1Text);

        return {
            productUrl: url,
            tcgPlayerId: tcgPlayerIdStr ? parseInt(tcgPlayerIdStr, 10) : undefined,
            priceChartingId: priceChartingIdStr ? parseInt(priceChartingIdStr, 10) : undefined,
            cardNumber: cardNumber || undefined,
            details,
            setSlug: extractSlug(url, 'game'),
            setName: setName || undefined,
            productSlug: url.split('/').filter(Boolean).pop(),
            title: h1Text.replace(/\s+/g, ' '),
            imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.pricecharting.com${imageUrl}`) : undefined,
            productType,
            ...this.parsePricesFromTable($),
        };
    }

    private parsePricesFromTable($: cheerio.CheerioAPI): Partial<ParsedProductDetails> {
        const prices: Partial<ParsedProductDetails> = {};
        const priceTable = $('#price_data, .price_details');

        if (priceTable.length === 0) {
            this.logger.warn('Price table not found on page');
            return prices;
        }

        // 1. Try to parse as a horizontal table (Headers in thead, values in tbody)
        const headers: string[] = [];
        priceTable.find('thead th').each((_, el) => {
            headers.push($(el).text().trim());
        });

        if (headers.length > 0) {
            priceTable.find('tbody tr').first().find('td').each((i, el) => {
                const label = headers[i];
                if (!label) return;

                // Take ONLY the main price span, skip the "change" span
                const priceText = $(el).find('span.price.js-price').first().text().trim() ||
                    $(el).find('.js-price').first().text().trim() ||
                    $(el).contents().first().text().trim();

                const price = this.parsePrice(priceText);
                if (price !== undefined) {
                    this.assignPriceByLabel(prices, label, price);
                }
            });
        }

        // 2. Fallback or additional check for row-based table (Label in first td/th, value in second)
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

    private assignPriceByLabel(prices: Partial<ParsedProductDetails>, label: string, price: number) {
        if (label.includes('Ungraded')) {
            prices.rawPrice = price;
        } else if (label.includes('Grade 7')) {
            prices.grade7Price = price;
        } else if (label.includes('Grade 8')) {
            prices.grade8Price = price;
        } else if (label.includes('Grade 9.5')) {
            prices.grade95Price = price;
        } else if (label.includes('Grade 9')) { // Match after 9.5 to avoid partial matches
            prices.grade9Price = price;
        } else if (label.includes('PSA 10') || label.includes('Grade 10')) {
            prices.grade10Price = price;
        } else if (label.includes('New') || label.includes('Sealed')) {
            prices.sealedPrice = price;
        }
    }

    private parsePrice(text: string): number | undefined {
        if (!text || text.trim() === '-' || text.trim() === '') return undefined;
        // Handle cases like "$1,234.56"
        const cleaned = text.replace(/[$,]/g, '').trim();
        const price = parseFloat(cleaned);
        return isNaN(price) ? undefined : price;
    }

    private classifyProduct(title: string): PriceChartingProductType {
        const lowerTitle = title.toLowerCase();

        if (lowerTitle.includes('booster box') || lowerTitle.includes('24 packs') || lowerTitle.includes('display box')) {
            return 'SEALED_BOX';
        }

        if (lowerTitle.includes('booster pack')) {
            return 'SEALED_PACK';
        }

        if (
            lowerTitle.includes('deck') ||
            lowerTitle.includes('collection') ||
            lowerTitle.includes('gift set') ||
            lowerTitle.includes('box set') ||
            lowerTitle.includes('double pack') ||
            lowerTitle.includes('case') ||
            lowerTitle.includes('sleeves') ||
            lowerTitle.includes('playmat')
        ) {
            return 'SEALED_OTHER';
        }

        return 'SINGLE_CARD';
    }
}
