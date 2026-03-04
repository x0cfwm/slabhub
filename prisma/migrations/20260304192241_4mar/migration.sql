-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "fulfillmentOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
