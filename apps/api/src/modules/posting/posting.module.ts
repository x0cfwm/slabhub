import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';

@Module({
    imports: [InventoryModule],
    controllers: [PostingController],
    providers: [PostingService],
    exports: [PostingService],
})
export class PostingModule { }
