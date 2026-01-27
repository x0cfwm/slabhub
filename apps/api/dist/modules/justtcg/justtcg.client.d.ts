import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JustTcgMapping, JustTcgResponse } from './justtcg.types';
export declare class JustTcgClient {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKeys;
    private readonly keyMetadata;
    private currentKeyIndex;
    constructor(httpService: HttpService, configService: ConfigService);
    private getNextApiKey;
    private updateMetadata;
    fetchPages<T = any>(mapping: JustTcgMapping): AsyncGenerator<JustTcgResponse<T>>;
    fetchAll<T = any>(mapping: JustTcgMapping): Promise<T[]>;
    private fetchPage;
}
