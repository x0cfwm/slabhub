-- CreateTable
CREATE TABLE "WaitlistParticipant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistParticipant_email_key" ON "WaitlistParticipant"("email");

-- CreateIndex
CREATE INDEX "WaitlistParticipant_email_idx" ON "WaitlistParticipant"("email");
