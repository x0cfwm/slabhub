import { Controller, Get, Query, Param } from '@nestjs/common';
import { MarketPricingService } from './market.service';
import { GetMarketProductsDto } from './dto/market-products.dto';

@Controller('market')
export class MarketPricingController {
    constructor(private readonly marketService: MarketPricingService) { }

    @Get('products')
    async getProducts(@Query() query: GetMarketProductsDto) {
        return this.marketService.listProducts(query);
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
}
