-- CreateTable
CREATE TABLE "RefGame" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefSet" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "slug" TEXT,
    "gameExternalId" TEXT,
    "releaseDate" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefRarity" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefRarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefCondition" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefLanguage" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefPrinting" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefPrinting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefProduct" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "imageUrl" TEXT,
    "setExternalId" TEXT,
    "rarityExternalId" TEXT,
    "gameExternalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefGame_externalId_key" ON "RefGame"("externalId");

-- CreateIndex
CREATE INDEX "RefGame_externalId_idx" ON "RefGame"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefSet_externalId_key" ON "RefSet"("externalId");

-- CreateIndex
CREATE INDEX "RefSet_externalId_idx" ON "RefSet"("externalId");

-- CreateIndex
CREATE INDEX "RefSet_gameExternalId_idx" ON "RefSet"("gameExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefRarity_externalId_key" ON "RefRarity"("externalId");

-- CreateIndex
CREATE INDEX "RefRarity_externalId_idx" ON "RefRarity"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefCondition_externalId_key" ON "RefCondition"("externalId");

-- CreateIndex
CREATE INDEX "RefCondition_externalId_idx" ON "RefCondition"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefLanguage_externalId_key" ON "RefLanguage"("externalId");

-- CreateIndex
CREATE INDEX "RefLanguage_externalId_idx" ON "RefLanguage"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefPrinting_externalId_key" ON "RefPrinting"("externalId");

-- CreateIndex
CREATE INDEX "RefPrinting_externalId_idx" ON "RefPrinting"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefProduct_externalId_key" ON "RefProduct"("externalId");

-- CreateIndex
CREATE INDEX "RefProduct_externalId_idx" ON "RefProduct"("externalId");

-- CreateIndex
CREATE INDEX "RefProduct_setExternalId_idx" ON "RefProduct"("setExternalId");

-- CreateIndex
CREATE INDEX "RefProduct_rarityExternalId_idx" ON "RefProduct"("rarityExternalId");

-- CreateIndex
CREATE INDEX "RefProduct_gameExternalId_idx" ON "RefProduct"("gameExternalId");
