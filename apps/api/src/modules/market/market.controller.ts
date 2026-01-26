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

    @Get('products/:id/prices')
    async getProductPrices(@Param('id') id: string) {
        return this.marketService.getProductPriceHistory(id);
    }
}
