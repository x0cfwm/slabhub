-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "certificationNumber" TEXT,
ADD COLUMN     "gradingMeta" JSONB;

-- AlterTable
ALTER TABLE "RefProduct" ADD COLUMN     "priceChartingUrl" TEXT;

-- CreateIndex
CREATE INDEX "InventoryItem_certificationNumber_idx" ON "InventoryItem"("certificationNumber");
