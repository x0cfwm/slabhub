-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "refPriceChartingProductId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryItem_refPriceChartingProductId_idx" ON "InventoryItem"("refPriceChartingProductId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_refPriceChartingProductId_fkey" FOREIGN KEY ("refPriceChartingProductId") REFERENCES "RefPriceChartingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
