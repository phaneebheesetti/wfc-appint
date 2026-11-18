ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_users.all' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_users.select' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_users.insert' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_users.update' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_users.delete' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_role" ADD VALUE 'participant';

COMMIT;

CREATE TABLE "campaigns_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "campaigns_users" ENABLE ROW LEVEL SECURITY;
DROP POLICY "campaigns_participants_all" ON "campaigns_participants" CASCADE;
DROP POLICY "campaigns_participants_select" ON "campaigns_participants" CASCADE;
DROP POLICY "campaigns_participants_insert" ON "campaigns_participants" CASCADE;
DROP POLICY "campaigns_participants_update" ON "campaigns_participants" CASCADE;
DROP POLICY "campaigns_participants_delete" ON "campaigns_participants" CASCADE;
DROP TABLE "campaigns_participants" CASCADE;
ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;
ALTER TABLE "organizations_users" ADD COLUMN "eligible" boolean DEFAULT true NOT NULL;
ALTER TABLE "campaigns_users" ADD CONSTRAINT "campaigns_users_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campaigns_users" ADD CONSTRAINT "campaigns_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "campaigns_users_all" ON "campaigns_users" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('campaigns_users.all'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_users_select" ON "campaigns_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('campaigns_users.select'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_users_insert" ON "campaigns_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('campaigns_users.insert'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_users_update" ON "campaigns_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('campaigns_users.update'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_users_delete" ON "campaigns_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('campaigns_users.delete'::public.app_permission) AS authorize));
