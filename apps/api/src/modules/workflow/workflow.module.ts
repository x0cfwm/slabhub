import { Module } from '@nestjs/common';
import { InventoryStatusController } from './inventory-status.controller';
import { InventoryStatusService } from './inventory-status.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [InventoryStatusController],
    providers: [InventoryStatusService],
    exports: [InventoryStatusService],
})
export class WorkflowModule { }
