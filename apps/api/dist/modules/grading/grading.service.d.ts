import { GradingHttpClient } from './http/grading-http.client';
import { GradingLookupDto } from './dto/lookup.dto';
import { GradingLookupResult } from './types/grading.types';
export declare class GradingService {
    private readonly httpClient;
    private readonly logger;
    private cache;
    private readonly CACHE_TTL;
    constructor(httpClient: GradingHttpClient);
    lookup(dto: GradingLookupDto): Promise<GradingLookupResult>;
}
