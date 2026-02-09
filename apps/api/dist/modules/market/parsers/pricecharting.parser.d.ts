import { ConfigService } from '@nestjs/config';
export interface PriceChartingEntry {
    date: string;
    title: string;
    price: number;
    source: 'eBay' | 'TCGPlayer' | 'Unknown';
    link?: string;
    grade?: string;
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
export declare class PriceChartingParser {
    private readonly configService;
    private readonly logger;
    private readonly userAgent;
    private readonly proxyAgent?;
    constructor(configService: ConfigService);
    parse(url: string): Promise<PriceChartingResponse>;
    private processRows;
    private parsePrice;
    private normalizeDate;
    private inferSource;
}
