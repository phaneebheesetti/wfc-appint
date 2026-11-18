ALTER TABLE "campaign_announcements" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "campaigns_users" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "prizes" ALTER COLUMN "organization_id" SET NOT NULL;