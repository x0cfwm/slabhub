import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ParsedProductDetails, PriceChartingProductType, PriceChartingSaleEntry } from './types';
import { canonicalizeUrl, distillMarketplaceUrl, extractSlug } from './utils/url';

// Fallback only — parser prefers the dropdown on the product page.
const DEFAULT_GRADE_CLASS_MAP: Record<string, string> = {
    'completed-auctions-used': 'Raw',
    'completed-auctions-manual-only': 'PSA 10',
    'completed-auctions-box-only': 'Grade 9.5',
    'completed-auctions-graded': 'Grade 9',
    'completed-auctions-new': 'Grade 8',
    'completed-auctions-cib': 'Grade 7',
    'completed-auctions-loose-and-box': 'BGS 10',
    'completed-auctions-grade-seventeen': 'CGC 10',
    'completed-auctions-grade-eighteen': 'SGC 10',
    'completed-auctions-grade-nineteen': 'CGC 10 Pristine',
    'completed-auctions-grade-twenty': 'BGS 10 Black',
    'completed-auctions-grade-twenty-one': 'TAG 10',
    'completed-auctions-grade-twenty-two': 'ACE 10',
    'completed-auctions-grade-six': 'Grade 6',
    'completed-auctions-grade-five': 'Grade 5',
    'completed-auctions-grade-four': 'Grade 4',
    'completed-auctions-grade-three': 'Grade 3',
    'completed-auctions-box-and-manual': 'Grade 2',
    'completed-auctions-loose-and-manual': 'Grade 1',
};

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

    parseSetPage(html: string, baseUrl: string): { productUrls: string[]; nextPages: string[]; setCode?: string; setName?: string } {
        const $ = cheerio.load(html);
        const productUrls: string[] = [];
        const nextPages: string[] = [];

        // Extract Set Name
        const setName = $('.breadcrumbs a:last-of-type').text().trim() || $('h1').text().trim().replace(/^Prices For /i, '').replace(/ (One Piece Cards|Cards)$/i, '').trim();

        // Extract Set Code from description header
        let setCode: string | undefined;
        const descriptionText = $('.section-description, .description').text();
        const setCodeMatch = descriptionText.match(/Set Code:\s*([A-Z0-9-]+)/i);
        if (setCodeMatch) {
            let code = setCodeMatch[1].trim();
            // Refine code: One Piece codes like OP03-008 should be OP03
            // But PRB-02 should remain PRB-02
            const parts = code.split('-');
            if (parts.length > 1) {
                const lastPart = parts[parts.length - 1];
                // If it looks like a card number (3+ digits), drop it (unless it's the only part beyond the prefix)
                // Actually, let's use the rule: if parts[1] is 3+ digits, we stop at parts[0]
                if (parts[1] && /^\d{3,}$/.test(parts[1])) {
                    code = parts[0];
                } else if (parts.length > 2 && /^\d{3,}$/.test(parts[2])) {
                    // For PRB-01-001, parts[2] is 001
                    code = `${parts[0]}-${parts[1]}`;
                }
            }
            setCode = code;
        } else {
            // Fallback: look in all bold tags
            $('b').each((_, el) => {
                const text = $(el).text();
                if (text.includes('Set Code:')) {
                    setCode = text.replace('Set Code:', '').trim();
                    return false;
                }
            });
        }

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
            setCode,
            setName,
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
            if (tcgMatch) {details['TCGPlayer ID'] = tcgMatch[1];}

            const pcMatch = text.match(/PriceCharting ID:\s*(\d+)/i);
            if (pcMatch) {details['PriceCharting ID'] = pcMatch[1];}

            const cardNumMatch = text.match(/Card Number:\s*([^\n]+)/i);
            if (cardNumMatch) {details['Card Number'] = cardNumMatch[1].trim();}

            const setCodeMatch = text.match(/Set Code:\s*([^\n]+)/i);
            if (setCodeMatch) {details['Set Code'] = setCodeMatch[1].trim();}
        }

        const tcgPlayerIdStr = details['TCGPlayer ID'];
        const priceChartingIdStr = details['PriceCharting ID'];
        const cardNumber = details['Card Number'];
        let setCode = details['Set Code'];

        if (!setCode && cardNumber) {
            const match = cardNumber.match(/([A-Z]{1,}\d*-?[0-9A-Z]+|[A-Z]{1,}\d+)/i);
            if (match) {
                let code = match[1];
                const parts = code.split('-');
                if (parts.length > 1) {
                    if (parts[1] && /^\d{3,}$/.test(parts[1])) {
                        code = parts[0];
                    } else if (parts.length > 2 && /^\d{3,}$/.test(parts[2])) {
                        code = `${parts[0]}-${parts[1]}`;
                    }
                }
                setCode = code;
            }
        }

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
            setCode: setCode || undefined,
            productSlug: url.split('/').filter(Boolean).pop(),
            title: h1Text.replace(/\s+/g, ' '),
            imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.pricecharting.com${imageUrl}`) : undefined,
            productType,
            ...this.parsePricesFromTable($),
            sales: this.parseSalesFromPage($),
        };
    }

    private parseSalesFromPage($: cheerio.CheerioAPI): PriceChartingSaleEntry[] {
        const sales: PriceChartingSaleEntry[] = [];

        // Build the class→label map from the page's own dropdown so new grading
        // companies (TAG, ACE, …) are picked up without a code change.
        const classToLabel = new Map<string, string>();
        $('#completed-auctions-condition option').each((_, el) => {
            const value = $(el).attr('value');
            if (!value) {return;}
            const label = $(el).text().trim().replace(/\s*\(\d+\)\s*$/, '').trim();
            if (label) {classToLabel.set(value, label);}
        });

        if (classToLabel.size === 0) {
            for (const [k, v] of Object.entries(DEFAULT_GRADE_CLASS_MAP)) {
                classToLabel.set(k, v);
            }
        }

        let foundSales = false;
        for (const [cssClass, rawLabel] of classToLabel) {
            // Keep legacy label — DB already has millions of rows labelled "Raw".
            const label = rawLabel === 'Ungraded' ? 'Raw' : rawLabel;
            $(`div.${cssClass}`).each((_, el) => {
                const section = $(el);
                if (section.hasClass('tab')) {return;}
                const table = section.find('table.hoverable-rows');
                const rows = table.length > 0 ? table.find('tbody tr') : section.find('tbody tr');
                if (rows.length > 0) {
                    this.processRows($, rows, sales, label);
                    foundSales = true;
                }
            });
        }

        if (!foundSales) {
            let table = $('#completed_sales_table');
            if (table.length === 0) {table = $('.js-completed-sales-table');}
            if (table.length === 0) {
                $('table').each((_, el) => {
                    const text = $(el).text();
                    if (text.includes('Date') && text.includes('Price') && (text.includes('Title') || text.includes('Sale'))) {
                        table = $(el);
                        return false;
                    }
                });
            }
            const rows = table.find('tbody tr');
            if (rows.length > 0) {
                this.processRows($, rows, sales, 'Raw');
            }
        }
        return sales;
    }

    private processRows($: cheerio.CheerioAPI, rows: cheerio.Cheerio<any>, entries: PriceChartingSaleEntry[], grade: string) {
        rows.each((_, el) => {
            const dateTd = $(el).find('td.date');
            const titleTd = $(el).find('td.title');
            const priceTd = $(el).find('td.price, td.numeric').first();

            const dateStr = dateTd.text().trim();
            const titleLink = titleTd.find('a');
            const titleText = titleLink.text().replace(/\s+/g, ' ').trim();
            const fullTitleCellText = titleTd.text().trim();
            const link = titleLink.attr('href');

            let priceStr = priceTd.find('.js-price').first().text().trim();
            if (!priceStr) {priceStr = priceTd.text().trim();}

            if (!dateStr || !titleText || !priceStr) {return;}

            const price = this.parsePrice(priceStr);
            if (price === undefined) {return;}

            const date = this.normalizeDate(dateStr);
            const source = this.inferSource(fullTitleCellText);

            const distilledLink = link ? distillMarketplaceUrl(link.startsWith('http') ? link : `https://www.pricecharting.com${link}`) : undefined;
            entries.push({
                date,
                title: titleText,
                price,
                source,
                link: distilledLink,
                grade,
            });
        });
    }

    private normalizeDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {return dateStr;}
            return d.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    private inferSource(text: string): string {
        const lower = text.toLowerCase();
        if (lower.includes('ebay')) {return 'eBay';}
        if (lower.includes('tcgplayer')) {return 'TCGPlayer';}
        return 'Unknown';
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
                if (!label) {return;}

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
        if (!text || text.trim() === '-' || text.trim() === '') {return undefined;}
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
