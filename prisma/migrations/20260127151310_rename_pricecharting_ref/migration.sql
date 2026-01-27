/*
  Warnings:

  - You are about to drop the `PriceChartingProductRef` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PriceChartingProductRef";

-- CreateTable
CREATE TABLE "RefPriceChartingProduct" (
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

    CONSTRAINT "RefPriceChartingProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefPriceChartingProduct_productUrl_key" ON "RefPriceChartingProduct"("productUrl");

-- CreateIndex
CREATE INDEX "RefPriceChartingProduct_tcgPlayerId_idx" ON "RefPriceChartingProduct"("tcgPlayerId");

-- CreateIndex
CREATE INDEX "RefPriceChartingProduct_priceChartingId_idx" ON "RefPriceChartingProduct"("priceChartingId");

-- CreateIndex
CREATE INDEX "RefPriceChartingProduct_cardNumber_idx" ON "RefPriceChartingProduct"("cardNumber");
