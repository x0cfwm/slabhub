import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class PriceChartingClient {
    private readonly logger = new Logger(PriceChartingClient.name);
    private lastRequestTime = 0;
    private readonly minRequestInterval = 1000; // 1 second rate limit
    private readonly proxyAgent?: HttpsProxyAgent<string>;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        // Disable TLS verification to handle residential proxy SSL interception
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const customerId = this.configService.get<string>('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get<string>('BRIGHTDATA_ZONE');
        const token = this.configService.get<string>('BRIGHTDATA_TOKEN');

        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for PriceCharting crawling (Session: ${sessionId})`);
        }
    }

    async fetch(url: string, retries = 3): Promise<string> {
        await this.rateLimit();

        try {
            this.logger.debug(`Fetching ${url}`);
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    },
                    httpsAgent: this.proxyAgent,
                    proxy: false,
                    timeout: 30000,
                }),
            );
            this.lastRequestTime = Date.now();
            return response.data;
        } catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                const delay = Math.pow(2, 4 - retries) * 1000;
                this.logger.warn(`Retry fetching ${url} in ${delay}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.fetch(url, retries - 1);
            }
            this.logger.error(`Failed to fetch ${url}: ${error.message}`);
            throw error;
        }
    }

    async fetchBinary(url: string, retries = 3): Promise<Buffer> {
        await this.rateLimit();

        try {
            this.logger.debug(`Fetching binary content from ${url}`);
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                    httpsAgent: this.proxyAgent,
                    proxy: false,
                    timeout: 30000,
                    responseType: 'arraybuffer',
                }),
            );
            this.lastRequestTime = Date.now();
            return Buffer.from(response.data);
        } catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                const delay = Math.pow(2, 4 - retries) * 1000;
                this.logger.warn(`Retry fetching binary ${url} in ${delay}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.fetchBinary(url, retries - 1);
            }
            this.logger.error(`Failed to fetch binary ${url}: ${error.message}`);
            throw error;
        }
    }

    private async rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minRequestInterval) {
            const wait = this.minRequestInterval - elapsed;
            await new Promise((resolve) => setTimeout(resolve, wait));
        }
    }

    private shouldRetry(error: any): boolean {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            return !status || status === 429 || (status >= 500 && status < 600);
        }
        return true;
    }
}
