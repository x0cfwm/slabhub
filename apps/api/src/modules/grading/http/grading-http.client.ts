import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class GradingHttpClient {
    private readonly logger = new Logger(GradingHttpClient.name);
    private readonly proxyAgent?: HttpsProxyAgent<string>;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        // Disable TLS verification to handle residential proxy SSL interception
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const customerId = this.configService.get<string>('BRIGHTDATA_CUSTOMER_ID');
        const zone = this.configService.get<string>('BRIGHTDATA_ZONE');
        const token = this.configService.get<string>('BRIGHTDATA_TOKEN');

        if (customerId && zone && token) {
            const sessionId = Math.random().toString(36).substring(2, 10);
            const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}-session-${sessionId}:${token}@brd.superproxy.io:22225`;
            this.proxyAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
            this.logger.debug(`Initialized BrightData proxy for Grading HTTP client (Session: ${sessionId})`);
        }
    }

    async fetchPsaCert(certNumber: string): Promise<any> {
        const token = this.configService.get<string>('PSA_API_TOKEN');
        const url = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    httpsAgent: this.proxyAgent,
                    proxy: false,
                    timeout: 30000,
                })
            );
            return response.data;
        } catch (error) {
            this.handleAxiosError(error as AxiosError, url);
        }
    }

    async fetchBgsPage(certNumber: string): Promise<string> {
        throw new HttpException('BGS lookup not implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    private handleAxiosError(error: AxiosError, url: string) {
        if (error.response) {
            if (error.response.status === 404) {
                throw new HttpException('Certificate not found on PSA API', HttpStatus.NOT_FOUND, { cause: error });
            }
            if (error.response.status === 401 || error.response.status === 403) {
                throw new HttpException('PSA API Authentication failed or forbidden', HttpStatus.FORBIDDEN, { cause: error });
            }
            if (error.response.status === 429) {
                throw new HttpException('PSA API rate limited our request', HttpStatus.TOO_MANY_REQUESTS, { cause: error });
            }
            this.logger.error(`Error fetching ${url}: ${error.response.status} ${error.response.statusText}`);
            throw new HttpException(`Upstream error: ${error.response.status}`, HttpStatus.BAD_GATEWAY, { cause: error });
        }
        this.logger.error(`Network error fetching ${url}: ${error.message}`);
        throw new HttpException('Network or timeout error while fetching PSA API', HttpStatus.BAD_GATEWAY, { cause: error });
    }
}
