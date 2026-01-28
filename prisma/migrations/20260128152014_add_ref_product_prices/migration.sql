/*
  Warnings:

  - You are about to drop the column `priceChartingUrl` on the `RefProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RefProduct" DROP COLUMN "priceChartingUrl",
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "rawPrice" DECIMAL(10,2),
ADD COLUMN     "sealedPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "RefSyncProgress" (
    "id" TEXT NOT NULL,
    "mappingName" TEXT NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,
    "page" INTEGER NOT NULL DEFAULT 1,
    "cursor" TEXT,
    "totalItems" INTEGER,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefSyncProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefSyncProgress_mappingName_key" ON "RefSyncProgress"("mappingName");
