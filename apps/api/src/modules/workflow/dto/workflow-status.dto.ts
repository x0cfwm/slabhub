import { IsString, IsOptional, IsInt, IsHexColor, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkflowStatusDto {
    @ApiProperty({ example: 'Listed – Instagram' })
    @IsString()
    name: string;

    @ApiProperty({ required: false, example: '#94a3b8' })
    @IsOptional()
    @IsHexColor()
    color?: string;

    @ApiProperty({ required: false, example: 0 })
    @IsOptional()
    @IsInt()
    position?: number;

    @ApiProperty({ required: false, description: 'Optional system-defined identifier for core logic' })
    @IsOptional()
    @IsString()
    systemId?: string;

    @ApiProperty({ required: false, default: true, description: 'Whether to show this status as a column on the Kanban board' })
    @IsOptional()
    @IsBoolean()
    showOnKanban?: boolean;
}

export class UpdateWorkflowStatusDto {
    @ApiProperty({ required: false, example: 'Sold' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, example: '#ef4444' })
    @IsOptional()
    @IsHexColor()
    color?: string;

    @ApiProperty({ required: false, example: 5 })
    @IsOptional()
    @IsInt()
    position?: number;

    @ApiProperty({ required: false, description: 'Whether the status is enabled in the system' })
    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;

    @ApiProperty({ required: false, description: 'Optional system-defined identifier for core logic' })
    @IsOptional()
    @IsString()
    systemId?: string | null;

    @ApiProperty({ required: false, description: 'Whether to show this status as a column on the Kanban board' })
    @IsOptional()
    @IsBoolean()
    showOnKanban?: boolean;
}

export class ReorderWorkflowStatusDto {
    @ApiProperty({ description: 'The ID of the workflow status' })
    @IsString()
    id: string;

    @ApiProperty({ description: 'The new position index' })
    @IsInt()
    position: number;
}
