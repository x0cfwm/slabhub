import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class PriceChartingClient {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private lastRequestTime;
    private readonly minRequestInterval;
    private readonly proxyAgent?;
    constructor(httpService: HttpService, configService: ConfigService);
    fetch(url: string, retries?: number): Promise<string>;
    private rateLimit;
    private shouldRetry;
}
