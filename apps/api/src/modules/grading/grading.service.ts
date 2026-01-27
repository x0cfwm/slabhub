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
                const data = await this.httpClient.fetchPsaCert(dto.certNumber);

                if (!data || !data.PSACert) {
                    result = {
                        grader: 'PSA',
                        certNumber: dto.certNumber,
                        success: false,
                        error: 'Certificate data not found in PSA response',
                    };
                } else {
                    const cert = data.PSACert;
                    result = {
                        grader: 'PSA',
                        certNumber: dto.certNumber,
                        success: true,
                        data: {
                            gradeLabel: cert.GradeDescription || cert.CardGrade || '',
                            gradeValue: cert.GradeValue || (cert.GradeDescription ? cert.GradeDescription.match(/(\d+)/)?.[0] : ''),
                            cardName: cert.CardLine || `${cert.Year} ${cert.Brand} ${cert.Subject}`,
                            setName: cert.Brand || cert.Year || '',
                            cardNumber: cert.CardNumber || '',
                            year: cert.Year,
                            variant: cert.Variety,
                            population: cert.Population ? parseInt(cert.Population.toString().replace(/,/g, '')) : undefined,
                            images: cert.CertImages ? {
                                frontUrl: cert.CertImages[0]?.IsFront === true ? cert.CertImages[0]?.CERT_IMAGE_URL : cert.CertImages[1]?.CERT_IMAGE_URL,
                                backUrl: cert.CertImages[1]?.IsFront === false ? cert.CertImages[1]?.CERT_IMAGE_URL : cert.CertImages[0]?.CERT_IMAGE_URL,
                            } : undefined,
                            raw: cert,
                        },
                    };
                }
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
