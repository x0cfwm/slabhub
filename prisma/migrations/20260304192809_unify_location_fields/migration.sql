/*
  Warnings:

  - You are about to drop the column `locationCity` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `locationCountry` on the `SellerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';

-- Data migration
UPDATE "SellerProfile" SET "location" = "locationCity" || ', ' || "locationCountry"
WHERE "locationCity" IS NOT NULL AND "locationCountry" IS NOT NULL;

-- Drop old columns
ALTER TABLE "SellerProfile" DROP COLUMN "locationCity", DROP COLUMN "locationCountry";
