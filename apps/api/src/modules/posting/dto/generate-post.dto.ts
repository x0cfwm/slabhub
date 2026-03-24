import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PostingSelectionMode {
    BY_STATUS = 'BY_STATUS',
    MANUAL = 'MANUAL',
}

export enum PostingPlatform {
    FACEBOOK = 'FACEBOOK',
    INSTAGRAM = 'INSTAGRAM',
}

export enum PostingTone {
    HYPE = 'HYPE',
    PROFESSIONAL = 'PROFESSIONAL',
    CONCISE = 'CONCISE',
}

export enum PostingLanguage {
    EN = 'EN',
    RU = 'RU',
}

export enum PostingTemplate {
    GRID = 'GRID',
    COLLAGE = 'COLLAGE',
}

export enum PostingRatio {
    RATIO_1_1 = '1:1',
    RATIO_4_5 = '4:5',
    RATIO_9_16 = '9:16',
}

export enum PostingBackground {
    DARK = 'DARK',
    LIGHT = 'LIGHT',
    SUNSET = 'SUNSET',
}

export enum PostingGenerationTarget {
    BOTH = 'BOTH',
    TEXT_ONLY = 'TEXT_ONLY',
    IMAGE_ONLY = 'IMAGE_ONLY',
}

export class PostingTextOptionsDto {
    @ApiProperty({ enum: PostingPlatform, example: PostingPlatform.INSTAGRAM })
    @IsEnum(PostingPlatform)
    platform: PostingPlatform;

    @ApiProperty({ enum: PostingTone, example: PostingTone.HYPE })
    @IsEnum(PostingTone)
    tone: PostingTone;

    @ApiPropertyOptional({ enum: PostingLanguage, default: PostingLanguage.EN })
    @IsOptional()
    @IsEnum(PostingLanguage)
    language?: PostingLanguage;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    includePrice?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    includeCondition?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    includeGrade?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    includeHashtags?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    includeCta?: boolean;
}

export class PostingVisualOptionsDto {
    @ApiProperty({ enum: PostingTemplate, example: PostingTemplate.GRID })
    @IsEnum(PostingTemplate)
    template: PostingTemplate;

    @ApiProperty({ enum: PostingRatio, example: PostingRatio.RATIO_4_5 })
    @IsEnum(PostingRatio)
    ratio: PostingRatio;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    showPriceBadge?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    showPerformanceTag?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    showWatermark?: boolean;

    @ApiPropertyOptional({ enum: PostingBackground, default: PostingBackground.DARK })
    @IsOptional()
    @IsEnum(PostingBackground)
    backgroundStyle?: PostingBackground;
}

export class GeneratePostDto {
    @ApiProperty({ enum: PostingSelectionMode, example: PostingSelectionMode.BY_STATUS })
    @IsEnum(PostingSelectionMode)
    selectionMode: PostingSelectionMode;

    @ApiPropertyOptional({
        description: 'Statuses used when selectionMode = BY_STATUS',
        type: [String],
        example: ['status-listed-id'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(30)
    @IsString({ each: true })
    statusIds?: string[];

    @ApiPropertyOptional({
        description: 'Item IDs used when selectionMode = MANUAL',
        type: [String],
        example: ['item-1', 'item-2'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    itemIds?: string[];

    @ApiProperty({ type: PostingTextOptionsDto })
    @ValidateNested()
    @Type(() => PostingTextOptionsDto)
    textOptions: PostingTextOptionsDto;

    @ApiProperty({ type: PostingVisualOptionsDto })
    @ValidateNested()
    @Type(() => PostingVisualOptionsDto)
    visualOptions: PostingVisualOptionsDto;

    @ApiPropertyOptional({ enum: PostingGenerationTarget, default: PostingGenerationTarget.BOTH })
    @IsOptional()
    @IsEnum(PostingGenerationTarget)
    generationTarget?: PostingGenerationTarget;
}
