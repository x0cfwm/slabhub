export interface PriceChartingEntry {
    date: string;
    title: string;
    price: number;
    source: 'eBay' | 'TCGPlayer' | 'Unknown';
    link?: string;
}
export declare class PriceChartingParser {
    private readonly logger;
    private readonly userAgent;
    parse(url: string): Promise<PriceChartingEntry[]>;
    private processRows;
    private parsePrice;
    private normalizeDate;
    private inferSource;
}
