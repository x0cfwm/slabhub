import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JustTcgMapping, JustTcgResponse } from './justtcg.types';
export declare class JustTcgClient {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKey;
    constructor(httpService: HttpService, configService: ConfigService);
    fetchPages<T = any>(mapping: JustTcgMapping): AsyncGenerator<JustTcgResponse<T>>;
    fetchAll<T = any>(mapping: JustTcgMapping): Promise<T[]>;
    private fetchPage;
}
