import { Injectable, Logger } from '@nestjs/common';
import { GradingHttpClient } from './http/grading-http.client';
import { PsaParser } from './parsers/psa.parser';
import { BgsParser } from './parsers/bgs.parser';
import { GradingLookupDto } from './dto/lookup.dto';
import { GradingLookupResult } from './types/grading.types';

@Injectable()
export class GradingService {
    private readonly logger = new Logger(GradingService.name);
    private cache = new Map<string, { result: GradingLookupResult; timestamp: number }>();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor(private readonly httpClient: GradingHttpClient) { }

    async lookup(dto: GradingLookupDto): Promise<GradingLookupResult> {
        const cacheKey = `${dto.grader}:${dto.certNumber}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            this.logger.log(`Cache hit for ${cacheKey}`);
            return cached.result;
        }

        let result: GradingLookupResult;

        try {
            if (dto.grader === 'PSA') {
                const html = await this.httpClient.fetchPsaPage(dto.certNumber);
                result = PsaParser.parse(html, dto.certNumber);
            } else if (dto.grader === 'BGS') {
                // BGS is stubbed
                result = {
                    grader: 'BGS',
                    certNumber: dto.certNumber,
                    success: false,
                    error: 'BGS parsing not yet configured',
                };
            } else {
                result = {
                    grader: dto.grader,
                    certNumber: dto.certNumber,
                    success: false,
                    error: `Grader ${dto.grader} not supported`,
                };
            }

            if (result.success) {
                this.cache.set(cacheKey, { result, timestamp: Date.now() });
            }

            return result;
        } catch (error) {
            this.logger.error(`Lookup failed for ${cacheKey}: ${error.message}`);
            throw error;
        }
    }
}
