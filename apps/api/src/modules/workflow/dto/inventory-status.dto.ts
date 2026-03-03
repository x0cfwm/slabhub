import { IsString, IsOptional, IsInt, IsHexColor, IsUUID } from 'class-validator';

export class CreateInventoryStatusDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsInt()
    position?: number;
}

export class UpdateInventoryStatusDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsInt()
    position?: number;
}

export class ReorderInventoryStatusDto {
    @IsString()
    id: string;

    @IsInt()
    position: number;
}
