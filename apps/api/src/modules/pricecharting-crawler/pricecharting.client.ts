import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class PriceChartingClient {
    private readonly logger = new Logger(PriceChartingClient.name);
    private lastRequestTime = 0;
    private readonly minRequestInterval = 1000; // 1 second rate limit

    constructor(private readonly httpService: HttpService) { }

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
                    timeout: 10000,
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
