/*
  Warnings:

  - Added the required column `userId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "userId" TEXT;

-- Populate userId from SellerProfile
UPDATE "InventoryItem"
SET "userId" = (SELECT "userId" FROM "SellerProfile" WHERE "SellerProfile".id = "InventoryItem"."sellerId");

-- Fallback for any items that might not have a linked user yet (e.g. orphan seller profiles)
-- This is just to ensure the NOT NULL constraint doesn't fail.
UPDATE "InventoryItem"
SET "userId" = (SELECT id FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Now make it NOT NULL and drop sellerId requirement
ALTER TABLE "InventoryItem" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "sellerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryItem_userId_idx" ON "InventoryItem"("userId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
