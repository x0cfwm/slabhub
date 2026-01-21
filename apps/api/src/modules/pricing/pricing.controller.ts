import { Controller, Get, Post } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Get()
    async listPricing() {
        return this.pricingService.listPricing();
    }

    @Post('refresh')
    async refreshPricing() {
        return this.pricingService.refreshPricing();
    }
}
