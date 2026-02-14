import { z } from "zod";

export const GameEnum = z.enum(["MAGIC", "POKEMON", "ONE_PIECE", "LORCANA", "YU_GI_OH"]);
export const ConditionEnum = z.enum(["NM", "LP", "MP", "HP", "DMG"]);
export const GradingCompanyEnum = z.enum(["PSA", "BGS", "CGC", "ARS", "SGC"]);
export const InventoryStageEnum = z.enum([
    "ACQUIRED",
    "IN_TRANSIT",
    "BEING_GRADED",
    "AUTHENTICATED",
    "IN_STOCK",
    "LISTED",
    "SOLD",
    "ARCHIVED"
]);
export const SealedIntegrityEnum = z.enum(["MINT", "MINOR_DENTS", "DAMAGED", "OPENED"]);
export const ProductTypeEnum = z.enum([
    "BOOSTER_BOX",
    "BOOSTER_PACK",
    "STARTER_DECK",
    "ILLUSTRATION_BOX",
    "MINI_TIN",
    "PREMIUM_BOX",
    "GIFT_BOX",
    "ANNIVERSARY_SET",
    "PROMO_PACK",
    "TOURNAMENT_KIT",
    "CASE",
    "BUNDLE",
    "OTHER"
]);

export const VariantTypeEnum = z.enum(["NORMAL", "ALTERNATE_ART", "PARALLEL_FOIL"]);
export const LanguageEnum = z.enum(["JP", "EN"]);

const BaseInventorySchema = z.object({
    id: z.string().uuid().optional(),
    acquisitionPrice: z.number().min(0),
    acquisitionDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    acquisitionSource: z.string().optional(),
    storageLocation: z.string().optional(),
    stage: InventoryStageEnum,
    notes: z.string().optional(),
    listingPrice: z.number().min(0).optional(),
    sellingDescription: z.string().optional(),
    createdAt: z.string().datetime().optional()
});

export const SingleCardRawSchema = BaseInventorySchema.extend({
    type: z.literal("SINGLE_CARD_RAW"),
    cardVariantId: z.string().min(1),
    condition: ConditionEnum,
    quantity: z.number().int().min(1),
    certNumber: z.undefined() // Forbidden
});

export const SingleCardGradedSchema = BaseInventorySchema.extend({
    type: z.literal("SINGLE_CARD_GRADED"),
    cardVariantId: z.string().min(1),
    gradingCompany: GradingCompanyEnum,
    grade: z.union([z.number(), z.string()]),
    certNumber: z.string().min(1),
    gradingCost: z.number().min(0).optional(),
    slabImages: z.object({
        front: z.string().url().optional(),
        back: z.string().url().optional()
    }),
    quantity: z.literal(1), // MUST be 1
    condition: z.undefined() // Forbidden
});

export const SealedProductSchema = BaseInventorySchema.extend({
    type: z.literal("SEALED_PRODUCT"),
    productName: z.string().min(1),
    productType: ProductTypeEnum,
    language: LanguageEnum,
    setName: z.string().optional(),
    edition: z.string().optional(),
    integrity: SealedIntegrityEnum,
    quantity: z.number().int().min(1),
    configuration: z.object({
        containsBoosters: z.boolean(),
        boosterSets: z.array(z.string()).optional(),
        packsPerUnit: z.number().int().min(1).optional(),
        containsFixedCards: z.boolean(),
        containsPromo: z.boolean()
    }),
    condition: z.undefined() // Forbidden
});

export const InventoryItemSchema = z.discriminatedUnion("type", [
    SingleCardRawSchema,
    SingleCardGradedSchema,
    SealedProductSchema
]);

export type InventoryItemInput = z.infer<typeof InventoryItemSchema>;
