-- AlterTable
ALTER TABLE "RefPriceChartingProduct" ADD COLUMN     "lastParsedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PriceChartingSales" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL,
    "link" TEXT,
    "grade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChartingSales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceChartingSales_productId_idx" ON "PriceChartingSales"("productId");

-- CreateIndex
CREATE INDEX "PriceChartingSales_date_idx" ON "PriceChartingSales"("date");

-- AddForeignKey
ALTER TABLE "PriceChartingSales" ADD CONSTRAINT "PriceChartingSales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "RefPriceChartingProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
