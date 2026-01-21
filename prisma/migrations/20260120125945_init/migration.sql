-- CreateEnum
CREATE TYPE "InventoryStage" AS ENUM ('ACQUIRED', 'IN_TRANSIT', 'BEING_GRADED', 'AUTHENTICATED', 'IN_STOCK', 'LISTED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('SINGLE_CARD_RAW', 'SINGLE_CARD_GRADED', 'SEALED_PRODUCT');

-- CreateEnum
CREATE TYPE "GradeProvider" AS ENUM ('PSA', 'BGS', 'CGC', 'ARS', 'SGC');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NM', 'LP', 'MP', 'HP', 'DMG');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BOOSTER_BOX', 'BOOSTER_PACK', 'STARTER_DECK', 'ILLUSTRATION_BOX', 'MINI_TIN', 'PREMIUM_BOX', 'GIFT_BOX', 'ANNIVERSARY_SET', 'PROMO_PACK', 'TOURNAMENT_KIT', 'CASE', 'BUNDLE', 'OTHER');

-- CreateEnum
CREATE TYPE "SealedIntegrity" AS ENUM ('MINT', 'MINOR_DENTS', 'DAMAGED', 'OPENED');

-- CreateEnum
CREATE TYPE "VariantType" AS ENUM ('NORMAL', 'ALTERNATE_ART', 'PARALLEL_FOIL');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('JP', 'EN');

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "locationCountry" TEXT NOT NULL,
    "locationCity" TEXT NOT NULL,
    "paymentsAccepted" TEXT[],
    "meetupsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "socials" JSONB NOT NULL DEFAULT '{}',
    "wishlistText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardVariant" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantType" "VariantType" NOT NULL,
    "language" "Language" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "setNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSnapshot" (
    "id" TEXT NOT NULL,
    "cardProfileId" TEXT NOT NULL,
    "rawPrice" DECIMAL(10,2) NOT NULL,
    "sealedPrice" DECIMAL(10,2),
    "source" TEXT NOT NULL DEFAULT 'Mock:TCGPlayer',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "cardVariantId" TEXT,
    "productName" TEXT,
    "productType" "ProductType",
    "language" TEXT,
    "setName" TEXT,
    "edition" TEXT,
    "integrity" "SealedIntegrity",
    "configuration" JSONB,
    "gradeProvider" "GradeProvider",
    "gradeValue" TEXT,
    "certNumber" TEXT,
    "gradingCost" DECIMAL(10,2),
    "slabImages" JSONB DEFAULT '{}',
    "previousCertNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "condition" "Condition",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "stage" "InventoryStage" NOT NULL DEFAULT 'ACQUIRED',
    "listingPrice" DECIMAL(10,2),
    "acquisitionPrice" DECIMAL(10,2),
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionSource" TEXT,
    "storageLocation" TEXT,
    "notes" TEXT,
    "marketPriceSnapshot" DECIMAL(10,2),
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_handle_key" ON "SellerProfile"("handle");

-- CreateIndex
CREATE INDEX "SellerProfile_handle_idx" ON "SellerProfile"("handle");

-- CreateIndex
CREATE INDEX "CardProfile_name_idx" ON "CardProfile"("name");

-- CreateIndex
CREATE INDEX "CardProfile_set_idx" ON "CardProfile"("set");

-- CreateIndex
CREATE INDEX "CardProfile_cardNumber_idx" ON "CardProfile"("cardNumber");

-- CreateIndex
CREATE INDEX "CardVariant_cardId_idx" ON "CardVariant"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardVariant_cardId_variantType_language_key" ON "CardVariant"("cardId", "variantType", "language");

-- CreateIndex
CREATE UNIQUE INDEX "PricingSnapshot_cardProfileId_key" ON "PricingSnapshot"("cardProfileId");

-- CreateIndex
CREATE INDEX "PricingSnapshot_cardProfileId_idx" ON "PricingSnapshot"("cardProfileId");

-- CreateIndex
CREATE INDEX "InventoryItem_sellerId_idx" ON "InventoryItem"("sellerId");

-- CreateIndex
CREATE INDEX "InventoryItem_stage_idx" ON "InventoryItem"("stage");

-- CreateIndex
CREATE INDEX "InventoryItem_itemType_idx" ON "InventoryItem"("itemType");

-- CreateIndex
CREATE INDEX "InventoryItem_cardVariantId_idx" ON "InventoryItem"("cardVariantId");

-- AddForeignKey
ALTER TABLE "CardVariant" ADD CONSTRAINT "CardVariant_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CardProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_cardProfileId_fkey" FOREIGN KEY ("cardProfileId") REFERENCES "CardProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
