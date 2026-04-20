-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "showFacebookBadge" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: enable the public badge for sellers whose owner linked Facebook
-- AFTER account creation (explicit linking from settings or email-match login).
-- OAuth signup sets User.createdAt and User.facebookVerifiedAt in the same
-- INSERT, so the timestamps match — those accounts keep the false default.
UPDATE "SellerProfile" sp
SET "showFacebookBadge" = true
FROM "User" u
WHERE sp."userId" = u."id"
  AND u."facebookVerifiedAt" IS NOT NULL
  AND u."facebookVerifiedAt" > u."createdAt" + INTERVAL '30 seconds';
