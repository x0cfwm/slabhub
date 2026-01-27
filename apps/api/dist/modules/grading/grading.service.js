"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GradingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingService = void 0;
const common_1 = require("@nestjs/common");
const grading_http_client_1 = require("./http/grading-http.client");
let GradingService = GradingService_1 = class GradingService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.logger = new common_1.Logger(GradingService_1.name);
        this.cache = new Map();
        this.CACHE_TTL = 24 * 60 * 60 * 1000;
    }
    async lookup(dto) {
        const cacheKey = `${dto.grader}:${dto.certNumber}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            this.logger.log(`Cache hit for ${cacheKey}`);
            return cached.result;
        }
        let result;
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
                }
                else {
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
            }
            else if (dto.grader === 'BGS') {
                result = {
                    grader: 'BGS',
                    certNumber: dto.certNumber,
                    success: false,
                    error: 'BGS parsing not yet configured',
                };
            }
            else {
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
        }
        catch (error) {
            this.logger.error(`Lookup failed for ${cacheKey}: ${error.message}`);
            throw error;
        }
    }
};
exports.GradingService = GradingService;
exports.GradingService = GradingService = GradingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [grading_http_client_1.GradingHttpClient])
], GradingService);
//# sourceMappingURL=grading.service.js.map