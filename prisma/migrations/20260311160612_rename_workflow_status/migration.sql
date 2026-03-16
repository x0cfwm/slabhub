/*
  Warnings:

  - You are about to drop the `InventoryStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_statusId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryStatus" DROP CONSTRAINT "InventoryStatus_userId_fkey";

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "soldDate" TIMESTAMP(3),
ADD COLUMN     "soldPrice" DECIMAL(10,2);

-- DropTable
DROP TABLE "InventoryStatus";

-- CreateTable
CREATE TABLE "WorkflowStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowStatus_userId_idx" ON "WorkflowStatus"("userId");

-- CreateIndex
CREATE INDEX "WorkflowStatus_position_idx" ON "WorkflowStatus"("position");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStatus_userId_systemId_key" ON "WorkflowStatus"("userId", "systemId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "WorkflowStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStatus" ADD CONSTRAINT "WorkflowStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
