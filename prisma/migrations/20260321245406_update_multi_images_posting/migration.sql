/*
  Warnings:

  - The `imageDataUrl` column on the `GeneratedPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "GeneratedPost" DROP COLUMN "imageDataUrl",
ADD COLUMN     "imageDataUrl" TEXT[] DEFAULT ARRAY[]::TEXT[];
