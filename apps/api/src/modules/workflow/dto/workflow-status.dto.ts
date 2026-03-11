import { IsString, IsOptional, IsInt, IsHexColor, IsUUID } from 'class-validator';

export class CreateWorkflowStatusDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsInt()
    position?: number;
}

export class UpdateWorkflowStatusDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsInt()
    position?: number;

    @IsOptional()
    isEnabled?: boolean;
}

export class ReorderWorkflowStatusDto {
    @IsString()
    id: string;

    @IsInt()
    position: number;
}
