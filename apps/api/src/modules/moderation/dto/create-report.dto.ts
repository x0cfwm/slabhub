import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AbuseReportTargetDto {
    VENDOR = 'VENDOR',
    ITEM = 'ITEM',
}

export enum AbuseReportReasonDto {
    SPAM = 'SPAM',
    INAPPROPRIATE = 'INAPPROPRIATE',
    HARASSMENT = 'HARASSMENT',
    SCAM = 'SCAM',
    OTHER = 'OTHER',
}

export class CreateReportDto {
    @ApiProperty({ enum: AbuseReportTargetDto, description: 'What is being reported' })
    @IsEnum(AbuseReportTargetDto)
    targetType!: AbuseReportTargetDto;

    @ApiProperty({ description: 'Vendor handle (if targetType=VENDOR) or inventory item id (if targetType=ITEM)' })
    @IsString()
    targetId!: string;

    @ApiProperty({ enum: AbuseReportReasonDto })
    @IsEnum(AbuseReportReasonDto)
    reason!: AbuseReportReasonDto;

    @ApiProperty({ required: false, maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    details?: string;
}
