import { InventoryStage, GradeProvider, Condition, SealedIntegrity } from '@prisma/client';
export declare class UpdateInventoryItemDto {
    cardVariantId?: string;
    productName?: string;
    language?: string;
    setName?: string;
    edition?: string;
    integrity?: SealedIntegrity;
    configuration?: {
        containsBoosters: boolean;
        boosterSets?: string[];
        packsPerUnit?: number;
        containsFixedCards: boolean;
        containsPromo: boolean;
    };
    gradeProvider?: GradeProvider;
    gradeValue?: string;
    certNumber?: string;
    gradingCost?: number;
    slabImages?: {
        front?: string;
        back?: string;
    };
    condition?: Condition;
    quantity?: number;
    stage?: InventoryStage;
    listingPrice?: number;
    acquisitionPrice?: number;
    acquisitionDate?: string;
    acquisitionSource?: string;
    storageLocation?: string;
    notes?: string;
    photos?: string[];
}
