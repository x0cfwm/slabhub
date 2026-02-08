import { ParsedProductDetails } from './types';
export declare class PriceChartingParser {
    private readonly logger;
    parseCategoryPage(html: string, baseUrl: string): string[];
    parseSetPage(html: string, baseUrl: string): {
        productUrls: string[];
        nextPages: string[];
    };
    parseProductPage(html: string, url: string): ParsedProductDetails;
    private parsePricesFromTable;
    private assignPriceByLabel;
    private parsePrice;
    private classifyProduct;
}
