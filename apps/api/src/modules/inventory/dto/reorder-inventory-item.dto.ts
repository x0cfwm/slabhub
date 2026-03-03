import { IsString, IsInt, IsEnum, Min } from 'class-validator';
import { InventoryStage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderInventoryItemDto {
    @ApiProperty({ example: 'uuid-v4-item-id' })
    @IsString()
    id: string;

    @ApiProperty({ minimum: 0, example: 1 })
    @IsInt()
    @Min(0)
    sortOrder: number;

    @ApiProperty({ enum: InventoryStage, example: InventoryStage.IN_STOCK })
    @IsEnum(InventoryStage)
    stage: InventoryStage;
}
