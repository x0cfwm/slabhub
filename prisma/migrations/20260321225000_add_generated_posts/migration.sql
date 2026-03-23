-- CreateTable
CREATE TABLE "GeneratedPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectionMode" TEXT NOT NULL,
    "statusIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platform" TEXT NOT NULL,
    "generationTarget" TEXT NOT NULL DEFAULT 'BOTH',
    "caption" TEXT NOT NULL,
    "imageDataUrl" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "generatedItemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedPost_userId_createdAt_idx" ON "GeneratedPost"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
