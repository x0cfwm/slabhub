-- AlterTable
ALTER TABLE "RefPriceChartingProduct" ADD COLUMN     "grade10Price" DECIMAL(10,2),
ADD COLUMN     "grade7Price" DECIMAL(10,2),
ADD COLUMN     "grade8Price" DECIMAL(10,2),
ADD COLUMN     "grade95Price" DECIMAL(10,2),
ADD COLUMN     "grade9Price" DECIMAL(10,2),
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "rawPrice" DECIMAL(10,2),
ADD COLUMN     "sealedPrice" DECIMAL(10,2);
