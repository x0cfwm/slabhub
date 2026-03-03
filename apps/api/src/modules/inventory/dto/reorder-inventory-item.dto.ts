import { IsString, IsInt, IsEnum, Min, IsOptional } from 'class-validator';
import { InventoryStage } from '@prisma/client';

export class ReorderInventoryItemDto {
    @IsString()
    id: string;

    @IsInt()
    @Min(0)
    sortOrder: number;

    @IsEnum(InventoryStage)
    stage: InventoryStage;

    @IsOptional()
    @IsString()
    statusId?: string;
}
