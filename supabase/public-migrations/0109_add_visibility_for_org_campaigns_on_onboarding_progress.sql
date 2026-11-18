CREATE TYPE "public"."campaigns_visibility" AS ENUM('published', 'draft');
CREATE TYPE "public"."organizations_visibility" AS ENUM('draft', 'published');
ALTER TYPE "public"."campaigns_status" ADD VALUE 'inactive' BEFORE 'ended';
ALTER TABLE "campaigns" ADD COLUMN "visibility" "campaigns_visibility" DEFAULT 'published' NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "visibility" "organizations_visibility" DEFAULT 'published' NOT NULL;
ALTER TABLE "users" ADD COLUMN "onboarding_progress" jsonb;
CREATE INDEX "idx_campaigns_visibility" ON "campaigns" USING btree ("visibility");
CREATE INDEX "idx_organizations_visibility" ON "organizations" USING btree ("visibility");