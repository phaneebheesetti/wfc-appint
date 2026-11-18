ALTER TABLE "campaigns" ADD COLUMN "organization_id" uuid NOT NULL;
ALTER TABLE "campaigns" ADD COLUMN "sponsor_id" uuid NOT NULL;
ALTER TABLE "campaigns" ADD COLUMN "cases_goal" integer NOT NULL;
ALTER TABLE "campaigns" ADD CONSTRAINT "check_cases_goal" CHECK ("campaigns"."cases_goal" >= 0);