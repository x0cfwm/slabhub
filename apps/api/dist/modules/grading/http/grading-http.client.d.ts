import { HttpService } from '@nestjs/axios';
export declare class GradingHttpClient {
    private readonly httpService;
    private readonly logger;
    constructor(httpService: HttpService);
    fetchPsaPage(certNumber: string): Promise<string>;
    fetchBgsPage(certNumber: string): Promise<string>;
    private fetchWithRetry;
    private handleAxiosError;
}
