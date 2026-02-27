-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "marketPriceLastSaleDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "avatarId" TEXT,
ADD COLUMN     "referenceLinks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "upcomingEvents" JSONB NOT NULL DEFAULT '[]';

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
