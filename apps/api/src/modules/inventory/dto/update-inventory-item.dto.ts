import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsInt,
    Min,
    IsArray,
} from 'class-validator';
import {
    InventoryStage,
    GradeProvider,
    Condition,
    SealedIntegrity,
    ItemType,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryItemDto {
    @ApiProperty({ required: false, enum: ItemType })
    @IsOptional()
    @IsEnum(ItemType)
    itemType?: ItemType;

    // For single cards
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    cardVariantId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    refPriceChartingProductId?: string;

    // For sealed products
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    productName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    setName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    setCode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    cardNumber?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    edition?: string;

    @ApiProperty({ required: false, enum: SealedIntegrity })
    @IsOptional()
    @IsEnum(SealedIntegrity)
    integrity?: SealedIntegrity;

    @ApiProperty({ required: false })
    @IsOptional()
    configuration?: {
        containsBoosters: boolean;
        boosterSets?: string[];
        packsPerUnit?: number;
        containsFixedCards: boolean;
        containsPromo: boolean;
    };

    // For graded cards
    @ApiProperty({ required: false, enum: GradeProvider })
    @IsOptional()
    @IsEnum(GradeProvider)
    gradeProvider?: GradeProvider;

    @ApiProperty({ required: false })
    @IsOptional()
    gradeValue?: string | number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    grade?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    certNumber?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    gradingCost?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    slabImages?: {
        front?: string;
        back?: string;
    };

    // For raw cards
    @ApiProperty({ required: false, enum: Condition })
    @IsOptional()
    @IsEnum(Condition)
    condition?: Condition;

    // Common fields
    @ApiProperty({ required: false, minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @ApiProperty({ required: false, minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiProperty({ required: false, enum: InventoryStage })
    @IsOptional()
    @IsEnum(InventoryStage)
    stage?: InventoryStage;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    statusId?: string;

    @IsOptional()
    @IsNumber()
    listingPrice?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    acquisitionPrice?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    acquisitionDate?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    acquisitionSource?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storageLocation?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    sellingDescription?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    photos?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    frontMediaId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    backMediaId?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    extraMediaIds?: string[];
}
