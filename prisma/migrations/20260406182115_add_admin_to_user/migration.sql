/*
  Warnings:

  - You are about to drop the `CardSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "admin" INTEGER NOT NULL DEFAULT 0;

