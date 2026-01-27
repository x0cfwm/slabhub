import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JustTcgMapping, JustTcgResponse } from './justtcg.types';

interface KeyMetadata {
    apiRequestLimit: number;
    apiDailyLimit: number;
    apiRateLimit: number;
    apiRequestsUsed: number;
    apiDailyRequestsUsed: number;
    apiRequestsRemaining: number;
    apiDailyRequestsRemaining: number;
    apiPlan: string;
    lastUsed: number;
    nextAvailableAt: number;
}

@Injectable()
export class JustTcgClient {
    private readonly logger = new Logger(JustTcgClient.name);
    private readonly baseUrl: string;
    private readonly apiKeys: string[];
    private readonly keyMetadata = new Map<string, KeyMetadata>();
    private currentKeyIndex = 0;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('JUSTTCG_BASE_URL', 'https://api.justtcg.com');
        const rawKeys = this.configService.getOrThrow<string>('JUSTTCG_API_KEY');
        this.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
        if (this.apiKeys.length === 0) {
            throw new Error('JUSTTCG_API_KEY must contain at least one key');
        }

        // Initialize metadata with optimistic values
        for (const key of this.apiKeys) {
            this.keyMetadata.set(key, {
                apiRequestLimit: 1000,
                apiDailyLimit: 100,
                apiRateLimit: 10,
                apiRequestsUsed: 0,
                apiDailyRequestsUsed: 0,
                apiRequestsRemaining: 10,
                apiDailyRequestsRemaining: 100,
                apiPlan: 'Unknown',
                lastUsed: 0,
                nextAvailableAt: 0,
            });
        }
    }

    private getNextApiKey(): string {
        const now = Date.now();
        let bestKey: string | null = null;
        let earliestWait = Infinity;

        // Try to pick the next key in round-robin fashion that has quota
        for (let i = 0; i < this.apiKeys.length; i++) {
            const index = (this.currentKeyIndex + i) % this.apiKeys.length;
            const key = this.apiKeys[index];
            const meta = this.keyMetadata.get(key)!;

            if (meta.apiDailyRequestsRemaining > 0) {
                if (now >= meta.nextAvailableAt) {
                    this.currentKeyIndex = (index + 1) % this.apiKeys.length;
                    return key;
                }
                earliestWait = Math.min(earliestWait, meta.nextAvailableAt);
            }
        }

        // If no keys are ready but some have daily quota
        if (earliestWait !== Infinity) {
            const waitMs = earliestWait - now;
            this.logger.warn(`All available keys are rate-limited. Next key ready in ${Math.ceil(waitMs / 1000)}s`);
            return this.apiKeys[this.currentKeyIndex]; // Will likely trigger a wait in fetchPage
        }

        // No keys have daily quota left
        throw new Error('All JustTCG API keys have exhausted their daily quota.');
    }

    private updateMetadata(key: string, metadata: JustTcgResponse['_metadata']) {
        if (!metadata) return;

        const current = this.keyMetadata.get(key)!;

        // The API has two separate limits:
        // 1. apiRateLimit (10 RPM) - rolling 1-minute window
        // 2. apiDailyLimit (100/day) - resets at 12 AM UTC

        // Check if we've hit the rolling window limit (10 requests per minute)
        const isRateLimitWindowExhausted = metadata.apiRequestsUsed >= metadata.apiRateLimit;

        // Check if we've exhausted the daily quota
        const isDailyQuotaExhausted = metadata.apiDailyRequestsRemaining <= 0;

        this.keyMetadata.set(key, {
            ...current,
            ...metadata,
            lastUsed: Date.now(),
            // If rate window exhausted: wait 60s for rolling window to refresh
            // If daily quota exhausted: mark as unavailable (will be skipped)
            nextAvailableAt: isRateLimitWindowExhausted && !isDailyQuotaExhausted
                ? Date.now() + 61000 // Wait 1 minute for RPM window to refresh
                : isDailyQuotaExhausted
                    ? Date.now() + (24 * 60 * 60 * 1000) // Wait until next day
                    : 0,
        });

        const maskedKey = `${key.substring(0, 8)}...`;
        this.logger.log(
            `Key ${maskedKey} usage: daily ${metadata.apiDailyRequestsUsed}/${metadata.apiDailyLimit}, ` +
            `RPM window ${metadata.apiRequestsUsed}/${metadata.apiRateLimit} (${metadata.apiPlan})`,
        );

        if (isRateLimitWindowExhausted && !isDailyQuotaExhausted) {
            this.logger.debug(`Key ${maskedKey} hit RPM limit (${metadata.apiRateLimit}). Will wait 60s or switch to another key.`);
        }

        if (isDailyQuotaExhausted) {
            this.logger.error(`Key ${maskedKey} DAILY QUOTA EXHAUSTED! ${metadata.apiDailyRequestsUsed}/${metadata.apiDailyLimit} used.`);
        }

        if (metadata.apiDailyRequestsRemaining < 10 && !isDailyQuotaExhausted) {
            this.logger.warn(`Key ${maskedKey} running low: ${metadata.apiDailyRequestsRemaining} daily requests remaining.`);
        }
    }

    async *fetchPages<T = any>(mapping: JustTcgMapping): AsyncGenerator<JustTcgResponse<T>> {
        let page = 1;
        let offset = 0;
        let cursor: string | undefined;
        let hasNextPage = true;

        while (hasNextPage) {
            const response = await this.fetchPage<T>(mapping, page, cursor, offset);
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
            const key = this.getNextApiKey();
            const meta = this.keyMetadata.get(key)!;
            const now = Date.now();

            if (now < meta.nextAvailableAt) {
                const waitMs = meta.nextAvailableAt - now;
                this.logger.log(`Waiting ${Math.ceil(waitMs / 1000)}s for key ${key.substring(0, 8)}... to replenish...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }

            try {
                const { data } = await firstValueFrom(
                    this.httpService.get<JustTcgResponse<T>>(mapping.endpoint, {
                        baseURL: this.baseUrl,
                        params,
                        headers: {
                            'x-api-key': key,
                        },
                        timeout: 10000,
                    }),
                );

                this.updateMetadata(key, data._metadata);
                return data;
            } catch (error: any) {
                attempt++;
                const status = error.response?.status;

                if (error.response?.data?._metadata) {
                    this.updateMetadata(key, error.response.data._metadata);
                }

                if (status === 401 || status === 403) {
                    this.logger.error(`Invalid or unauthorized API key: ${key.substring(0, 8)}...`);
                    // Remove key from rotation if it's invalid
                    const idx = this.apiKeys.indexOf(key);
                    if (idx > -1) this.apiKeys.splice(idx, 1);
                    if (this.apiKeys.length === 0) throw new Error('No valid API keys remaining');
                    continue;
                }

                const shouldRetry = attempt <= retries && (status === 429 || (status >= 500 && status <= 599));

                if (!shouldRetry) {
                    const errorData = error.response?.data;
                    const clearError = errorData?.message || error.message;
                    this.logger.error(
                        `Failed to fetch ${mapping.endpoint} (${status}): ${clearError}` +
                        (errorData && !errorData.message ? ` - Response: ${JSON.stringify(errorData)}` : ''),
                    );
                    throw error;
                }


                // If rate limited, mark key and pick another or wait
                if (status === 429) {
                    // The retry-after header from JustTCG API is often very long (hours)
                    // But we know the RPM window is 60 seconds, so we'll use that
                    meta.nextAvailableAt = Date.now() + 61000; // 61 seconds
                    this.logger.debug(`Key ${key.substring(0, 8)}... hit 429. Marked for 60s cooldown. Trying next key...`);
                    // Don't wait here - continue to next iteration which will pick another key
                    continue;
                } else {
                    const delay = Math.pow(2, attempt) * 2000;
                    this.logger.warn(`Retrying ${mapping.endpoint} (attempt ${attempt}) in ${delay}ms due to status ${status}...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }

            }
        }
        throw new Error(`Failed to fetch ${mapping.endpoint} after ${retries} retries`);
    }
}
