import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JustTcgMapping, JustTcgResponse } from './justtcg.types';

@Injectable()
export class JustTcgClient {
    private readonly logger = new Logger(JustTcgClient.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('JUSTTCG_BASE_URL', 'https://api.justtcg.com');
        this.apiKey = this.configService.getOrThrow<string>('JUSTTCG_API_KEY');
    }

    async *fetchPages<T = any>(mapping: JustTcgMapping): AsyncGenerator<JustTcgResponse<T>> {
        let page = 1;
        let offset = 0;
        let cursor: string | undefined;
        let hasNextPage = true;
        let requestCount = 0;

        while (hasNextPage) {
            // Respect the 10 requests per minute limit (approx 1 request every 6 seconds)
            if (requestCount > 0) {
                const rpmDelay = 6100; // 6.1s to be safe
                this.logger.log(`Rate limiting: waiting ${rpmDelay}ms before next request...`);
                await new Promise((resolve) => setTimeout(resolve, rpmDelay));
            }

            const response = await this.fetchPage<T>(mapping, page, cursor, offset);
            requestCount++;
            yield response;

            if (mapping.pagination === 'none') {
                hasNextPage = false;
            } else if (mapping.pagination === 'page') {
                const lastPage = response.meta?.lastPage ?? 1;
                if (page >= lastPage) {
                    hasNextPage = false;
                } else {
                    page++;
                }
            } else if (mapping.pagination === 'cursor') {
                cursor = response.meta?.nextCursor;
                hasNextPage = !!cursor;
            } else if (mapping.pagination === 'offset') {
                if (response.meta?.hasMore) {
                    offset += (mapping.limit ?? 20);
                    hasNextPage = true;
                } else {
                    hasNextPage = false;
                }
            }
        }
    }

    async fetchAll<T = any>(mapping: JustTcgMapping): Promise<T[]> {
        const allItems: T[] = [];
        for await (const response of this.fetchPages<T>(mapping)) {
            allItems.push(...response.data);
        }
        return allItems;
    }

    private async fetchPage<T>(
        mapping: JustTcgMapping,
        page: number,
        cursor?: string,
        offset?: number,
    ): Promise<JustTcgResponse<T>> {
        const params: Record<string, any> = { limit: mapping.limit ?? 20, ...mapping.params };
        if (mapping.pagination === 'page') {
            params.page = page;
        } else if (mapping.pagination === 'cursor' && cursor) {
            params.cursor = cursor;
        } else if (mapping.pagination === 'offset' && offset !== undefined) {
            params.offset = offset;
        }

        const retries = 5;
        let attempt = 0;

        while (attempt <= retries) {
            try {
                const { data } = await firstValueFrom(
                    this.httpService.get<JustTcgResponse<T>>(mapping.endpoint, {
                        baseURL: this.baseUrl,
                        params,
                        headers: {
                            'x-api-key': this.apiKey,
                        },
                        timeout: 10000,
                    }),
                );
                return data;
            } catch (error: any) {
                attempt++;
                const status = error.response?.status;
                const shouldRetry = attempt <= retries && (status === 429 || (status >= 500 && status <= 599));

                if (!shouldRetry) {
                    const errorData = error.response?.data;
                    this.logger.error(
                        `Failed to fetch ${mapping.endpoint} after ${attempt} attempts: ${error.message}${errorData ? ' - Response: ' + JSON.stringify(errorData) : ''
                        }`,
                    );
                    throw error;
                }

                // If rate limited, wait longer
                const baseDelay = status === 429 ? 30000 : 2000;
                const delay = Math.pow(2, attempt) * baseDelay;
                this.logger.warn(`Retrying ${mapping.endpoint} (attempt ${attempt}) in ${delay}ms due to status ${status}...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error(`Failed to fetch ${mapping.endpoint} after ${retries} retries`);
    }
}
