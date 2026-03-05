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
    ItemType,
    InventoryStage,
    GradeProvider,
    Condition,
    ProductType,
    SealedIntegrity,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryItemDto {
    @ApiProperty({ enum: ItemType, example: ItemType.SINGLE_CARD_RAW })
    @IsEnum(ItemType)
    itemType: ItemType;

    // For single cards
    @ApiProperty({ required: false, example: 'uuid-v4-card-variant' })
    @IsOptional()
    @IsString()
    cardVariantId?: string;

    @ApiProperty({ required: false, example: '12345' })
    @IsOptional()
    @IsString()
    refPriceChartingProductId?: string;

    // For sealed products
    @ApiProperty({ required: false, example: 'Romance Dawn Booster Box' })
    @IsOptional()
    @IsString()
    productName?: string;

    @ApiProperty({ required: false, enum: ProductType })
    @IsOptional()
    @IsEnum(ProductType)
    productType?: ProductType;

    @ApiProperty({ required: false, example: 'Japanese' })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiProperty({ required: false, example: 'OP-01' })
    @IsOptional()
    @IsString()
    setName?: string;

    @ApiProperty({ required: false, example: 'OP01' })
    @IsOptional()
    @IsString()
    setCode?: string;

    @ApiProperty({ required: false, example: '001' })
    @IsOptional()
    @IsString()
    cardNumber?: string;

    @ApiProperty({ required: false, example: '1st Edition' })
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

    @ApiProperty({ required: false, example: '10' })
    @IsOptional()
    @IsString()
    gradeValue?: string;

    @ApiProperty({ required: false, example: '12345678' })
    @IsOptional()
    @IsString()
    certNumber?: string;

    @ApiProperty({ required: false, example: '12345678' })
    @IsOptional()
    @IsString()
    certificationNumber?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    gradingMeta?: any;

    @ApiProperty({ required: false, example: 25.0 })
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
    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @ApiProperty({ required: false, example: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiProperty({ required: false, enum: InventoryStage })
    @IsOptional()
    @IsEnum(InventoryStage)
    stage?: InventoryStage;

    @ApiProperty({ required: false, example: 100.0 })
    @IsOptional()
    @IsNumber()
    listingPrice?: number;

    @ApiProperty({ required: false, example: 80.0 })
    @IsOptional()
    @IsNumber()
    acquisitionPrice?: number;

    @ApiProperty({ required: false, example: '2024-01-01' })
    @IsOptional()
    @IsString()
    acquisitionDate?: string;

    @ApiProperty({ required: false, example: 'eBay' })
    @IsOptional()
    @IsString()
    acquisitionSource?: string;

    @ApiProperty({ required: false, example: 'Binder A' })
    @IsOptional()
    @IsString()
    storageLocation?: string;

    @ApiProperty({ required: false, example: 'Perfect condition' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ required: false, example: 'Beautiful card' })
    @IsOptional()
    @IsString()
    sellingDescription?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    photos?: string[];

    @ApiProperty({ required: false, example: 'media-id-front' })
    @IsOptional()
    @IsString()
    frontMediaId?: string;

    @ApiProperty({ required: false, example: 'media-id-back' })
    @IsOptional()
    @IsString()
    backMediaId?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    extraMediaIds?: string[];
}
