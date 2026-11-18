CREATE TYPE "public"."announcement_status" AS ENUM('delivered', 'failed');
CREATE TYPE "public"."announcement_type" AS ENUM('sms', 'email', 'app');
ALTER TYPE "public"."app_permission" ADD VALUE 'campaign_announcements.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaign_announcements.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaign_announcements.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaign_announcements.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaign_announcements.delete';

COMMIT;

CREATE TABLE "campaign_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" "announcement_type" NOT NULL,
	"status" "announcement_status" DEFAULT 'delivered' NOT NULL,
	"reach" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "campaign_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_announcements" ADD CONSTRAINT "campaign_announcements_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campaign_announcements" ADD CONSTRAINT "campaign_announcements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_campaign_announcements_campaign_id" ON "campaign_announcements" USING btree ("campaign_id");
CREATE INDEX "idx_campaign_announcements_created_by_user_id" ON "campaign_announcements" USING btree ("created_by_user_id");
CREATE POLICY "campaign_announcements_all" ON "campaign_announcements" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('campaign_announcements.all'::public.app_permission) AS authorize));
CREATE POLICY "campaign_announcements_select" ON "campaign_announcements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('campaign_announcements.select'::public.app_permission) AS authorize));
CREATE POLICY "campaign_announcements_insert" ON "campaign_announcements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('campaign_announcements.insert'::public.app_permission) AS authorize));
CREATE POLICY "campaign_announcements_update" ON "campaign_announcements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('campaign_announcements.update'::public.app_permission) AS authorize));
CREATE POLICY "campaign_announcements_delete" ON "campaign_announcements" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('campaign_announcements.delete'::public.app_permission) AS authorize));