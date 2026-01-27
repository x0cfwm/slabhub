import { HttpService } from '@nestjs/axios';
export declare class PriceChartingClient {
    private readonly httpService;
    private readonly logger;
    private lastRequestTime;
    private readonly minRequestInterval;
    constructor(httpService: HttpService);
    fetch(url: string, retries?: number): Promise<string>;
    private rateLimit;
    private shouldRetry;
}
