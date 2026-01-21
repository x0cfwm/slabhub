import { Controller, Get, Param, Query } from '@nestjs/common';
import { CardsService } from './cards.service';
import { QueryCardsDto } from './dto/query-cards.dto';

@Controller('cards')
export class CardsController {
    constructor(private readonly cardsService: CardsService) { }

    @Get()
    async listCards(@Query() dto: QueryCardsDto) {
        return this.cardsService.listCards(dto.query);
    }

    @Get(':id')
    async getCard(@Param('id') id: string) {
        return this.cardsService.getCard(id);
    }

    @Get(':id/variants')
    async getCardVariants(@Param('id') id: string) {
        return this.cardsService.listCardVariants(id);
    }
}
