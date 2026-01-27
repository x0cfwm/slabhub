-- AlterTable
ALTER TABLE "RefProduct" ADD COLUMN     "tcgPlayerId" INTEGER;

-- CreateTable
CREATE TABLE "PriceChartingProductRef" (
    "id" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "tcgPlayerId" INTEGER,
    "priceChartingId" INTEGER,
    "cardNumber" TEXT,
    "details" JSONB NOT NULL,
    "categorySlug" TEXT,
    "setSlug" TEXT,
    "productSlug" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceChartingProductRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceChartingProductRef_productUrl_key" ON "PriceChartingProductRef"("productUrl");

-- CreateIndex
CREATE INDEX "PriceChartingProductRef_tcgPlayerId_idx" ON "PriceChartingProductRef"("tcgPlayerId");

-- CreateIndex
CREATE INDEX "PriceChartingProductRef_priceChartingId_idx" ON "PriceChartingProductRef"("priceChartingId");

-- CreateIndex
CREATE INDEX "PriceChartingProductRef_cardNumber_idx" ON "PriceChartingProductRef"("cardNumber");

-- CreateIndex
CREATE INDEX "RefProduct_tcgPlayerId_idx" ON "RefProduct"("tcgPlayerId");
