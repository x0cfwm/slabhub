import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ParsedProductDetails } from './types';
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

        return {
            productUrl: url,
            tcgPlayerId: tcgPlayerIdStr ? parseInt(tcgPlayerIdStr, 10) : undefined,
            priceChartingId: priceChartingIdStr ? parseInt(priceChartingIdStr, 10) : undefined,
            cardNumber: cardNumber || undefined,
            details,
            setSlug: extractSlug(url, 'game'),
            productSlug: url.split('/').filter(Boolean).pop(),
        };
    }
}
