import { Controller, Get, Query, Param } from '@nestjs/common';
import { MarketPricingService } from './market.service';
import { GetMarketProductsDto } from './dto/market-products.dto';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('market')
export class MarketPricingController {
    constructor(private readonly marketService: MarketPricingService) { }

    @Get('sync-status')
    async getSyncStatus() {
        return this.marketService.getSyncStatus();
    }

    @Get('products')
    async getProducts(
        @Query() query: GetMarketProductsDto,
        @CurrentUserId() userId: string | undefined
    ) {
        return this.marketService.listProducts(query, userId);
    }

    @Get('sets')
    async getSets() {
        return this.marketService.listSets();
    }

    @Get('products/:id/prices')
    async getProductPrices(
        @Param('id') id: string,
        @Query('strict') strict?: string,
        @Query('refresh') refresh?: string
    ) {
        return this.marketService.getProductPriceHistory(
            id,
            strict === 'true',
            refresh === 'true'
        );
    }

    @Get('products/:id')
    async getProduct(@Param('id') id: string) {
        return this.marketService.getProduct(id);
    }
}
