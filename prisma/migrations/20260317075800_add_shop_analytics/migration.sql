-- CreateEnum
CREATE TYPE "ShopEventType" AS ENUM ('VIEW_SHOP', 'VIEW_ITEM', 'INQUIRY_START', 'INQUIRY_COMPLETE');

-- CreateTable
CREATE TABLE "ShopEvent" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "type" "ShopEventType" NOT NULL,
    "itemId" TEXT,
    "referrer" TEXT,
    "channel" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopEvent_sellerProfileId_idx" ON "ShopEvent"("sellerProfileId");

-- CreateIndex
CREATE INDEX "ShopEvent_createdAt_idx" ON "ShopEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShopEvent_type_idx" ON "ShopEvent"("type");

-- AddForeignKey
ALTER TABLE "ShopEvent" ADD CONSTRAINT "ShopEvent_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopEvent" ADD CONSTRAINT "ShopEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
