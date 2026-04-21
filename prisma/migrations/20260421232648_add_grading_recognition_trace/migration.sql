-- CreateTable
CREATE TABLE "GradingRecognitionTrace" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "rawCardNumber" TEXT,
    "language" TEXT,
    "treatment" TEXT,
    "grader" TEXT,
    "decisionReason" TEXT,
    "matchedProductId" TEXT,
    "ambiguous" BOOLEAN NOT NULL DEFAULT false,
    "candidateCount" INTEGER,
    "steps" JSONB NOT NULL,

    CONSTRAINT "GradingRecognitionTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingRecognitionTrace_createdAt_idx" ON "GradingRecognitionTrace"("createdAt");

-- CreateIndex
CREATE INDEX "GradingRecognitionTrace_userId_createdAt_idx" ON "GradingRecognitionTrace"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GradingRecognitionTrace_matchedProductId_idx" ON "GradingRecognitionTrace"("matchedProductId");

-- CreateIndex
CREATE INDEX "GradingRecognitionTrace_decisionReason_idx" ON "GradingRecognitionTrace"("decisionReason");
