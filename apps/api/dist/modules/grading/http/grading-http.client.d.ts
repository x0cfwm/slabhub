import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class GradingHttpClient {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly proxyAgent?;
    constructor(httpService: HttpService, configService: ConfigService);
    fetchPsaCert(certNumber: string): Promise<any>;
    fetchBgsPage(certNumber: string): Promise<string>;
    private handleAxiosError;
}
