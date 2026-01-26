import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class GradingHttpClient {
    private readonly logger = new Logger(GradingHttpClient.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) { }

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
                    timeout: 10000,
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
                throw new HttpException('Certificate not found on PSA API', HttpStatus.NOT_FOUND);
            }
            if (error.response.status === 401 || error.response.status === 403) {
                throw new HttpException('PSA API Authentication failed or forbidden', HttpStatus.FORBIDDEN);
            }
            if (error.response.status === 429) {
                throw new HttpException('PSA API rate limited our request', HttpStatus.TOO_MANY_REQUESTS);
            }
            this.logger.error(`Error fetching ${url}: ${error.response.status} ${error.response.statusText}`);
            throw new HttpException(`Upstream error: ${error.response.status}`, HttpStatus.BAD_GATEWAY);
        }
        this.logger.error(`Network error fetching ${url}: ${error.message}`);
        throw new HttpException('Network or timeout error while fetching PSA API', HttpStatus.BAD_GATEWAY);
    }
}
