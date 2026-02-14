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
} from '@prisma/client';

export class UpdateInventoryItemDto {
    // For single cards
    @IsOptional()
    @IsString()
    cardVariantId?: string;

    @IsOptional()
    @IsString()
    refPriceChartingProductId?: string;

    // For sealed products
    @IsOptional()
    @IsString()
    productName?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    setName?: string;

    @IsOptional()
    @IsString()
    edition?: string;

    @IsOptional()
    @IsEnum(SealedIntegrity)
    integrity?: SealedIntegrity;

    @IsOptional()
    configuration?: {
        containsBoosters: boolean;
        boosterSets?: string[];
        packsPerUnit?: number;
        containsFixedCards: boolean;
        containsPromo: boolean;
    };

    // For graded cards
    @IsOptional()
    @IsEnum(GradeProvider)
    gradeProvider?: GradeProvider;

    @IsOptional()
    @IsString()
    gradeValue?: string;

    @IsOptional()
    @IsString()
    certNumber?: string;

    @IsOptional()
    @IsNumber()
    gradingCost?: number;

    @IsOptional()
    slabImages?: {
        front?: string;
        back?: string;
    };

    // For raw cards
    @IsOptional()
    @IsEnum(Condition)
    condition?: Condition;

    // Common fields
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @IsOptional()
    @IsEnum(InventoryStage)
    stage?: InventoryStage;

    @IsOptional()
    @IsNumber()
    listingPrice?: number;

    @IsOptional()
    @IsNumber()
    acquisitionPrice?: number;

    @IsOptional()
    @IsString()
    acquisitionDate?: string;

    @IsOptional()
    @IsString()
    acquisitionSource?: string;

    @IsOptional()
    @IsString()
    storageLocation?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    sellingDescription?: string;

    @IsOptional()
    @IsArray()
    photos?: string[];
}
