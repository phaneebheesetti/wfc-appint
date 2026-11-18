ALTER TYPE "public"."announcement_status" RENAME TO "campaign_announcement_status";
ALTER TYPE "public"."announcement_type" RENAME TO "campaign_announcement_type";
-- ALTER TABLE "channels" ALTER COLUMN "name" DROP NOT NULL;
-- ALTER TABLE "channels" ADD CONSTRAINT "channels_name_unique" UNIQUE("name");
