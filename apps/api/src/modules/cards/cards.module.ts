import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

import { MediaModule } from '../media/media.module';

@Module({
    imports: [MediaModule],
    controllers: [CardsController],
    providers: [CardsService],
    exports: [CardsService],
})
export class CardsModule { }
