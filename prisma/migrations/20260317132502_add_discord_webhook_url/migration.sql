-- Missing migration recovered
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "discordWebhookUrl" TEXT;
