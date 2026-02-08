/*
  Warnings:

  - You are about to drop the column `tcgPlayerId` on the `RefProduct` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "RefProduct_tcgPlayerId_idx";

-- AlterTable
ALTER TABLE "RefPriceChartingProduct" ADD COLUMN     "localImagePath" TEXT;

-- AlterTable
ALTER TABLE "RefProduct" DROP COLUMN "tcgPlayerId",
ADD COLUMN     "grade10Price" DECIMAL(10,2),
ADD COLUMN     "grade7Price" DECIMAL(10,2),
ADD COLUMN     "grade8Price" DECIMAL(10,2),
ADD COLUMN     "grade95Price" DECIMAL(10,2),
ADD COLUMN     "grade9Price" DECIMAL(10,2);
