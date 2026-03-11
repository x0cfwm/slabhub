import { Module } from '@nestjs/common';
import { WorkflowStatusController } from './workflow-status.controller';
import { WorkflowStatusService } from './workflow-status.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WorkflowStatusController],
    providers: [WorkflowStatusService],
    exports: [WorkflowStatusService],
})
export class WorkflowModule { }
