CREATE TYPE "public"."campaigns_status" AS ENUM('active', 'ended', 'cancelled');
ALTER TABLE "campaigns" ADD COLUMN "status" "campaigns_status" DEFAULT 'active' NOT NULL;
