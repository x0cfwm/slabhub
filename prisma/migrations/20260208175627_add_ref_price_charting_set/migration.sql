-- AlterTable
ALTER TABLE "RefPriceChartingProduct" ADD COLUMN     "setId" TEXT;

-- CreateTable
CREATE TABLE "RefPriceChartingSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefPriceChartingSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefPriceChartingSet_name_key" ON "RefPriceChartingSet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RefPriceChartingSet_slug_key" ON "RefPriceChartingSet"("slug");

-- CreateIndex
CREATE INDEX "RefPriceChartingProduct_setId_idx" ON "RefPriceChartingProduct"("setId");

-- AddForeignKey
ALTER TABLE "RefPriceChartingProduct" ADD CONSTRAINT "RefPriceChartingProduct_setId_fkey" FOREIGN KEY ("setId") REFERENCES "RefPriceChartingSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
