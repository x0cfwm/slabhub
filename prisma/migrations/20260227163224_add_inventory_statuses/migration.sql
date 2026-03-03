-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "statusId" TEXT;

-- CreateTable
CREATE TABLE "InventoryStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryStatus_userId_idx" ON "InventoryStatus"("userId");

-- CreateIndex
CREATE INDEX "InventoryStatus_position_idx" ON "InventoryStatus"("position");

-- CreateIndex
CREATE INDEX "InventoryItem_statusId_idx" ON "InventoryItem"("statusId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InventoryStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStatus" ADD CONSTRAINT "InventoryStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
