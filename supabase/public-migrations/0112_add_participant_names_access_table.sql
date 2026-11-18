ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access.delete';

COMMIT;

CREATE TABLE "participant_names_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"fundraiser_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reset_details" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "participant_names_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participant_names_access" ADD CONSTRAINT "participant_names_access_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "participant_names_access" ADD CONSTRAINT "participant_names_access_fundraiser_user_id_users_id_fk" FOREIGN KEY ("fundraiser_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_participant_names_access_campaign_id" ON "participant_names_access" USING btree ("campaign_id");
CREATE POLICY "participant_names_access_all" ON "participant_names_access" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('participant_names_access.all'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_select" ON "participant_names_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('participant_names_access.select'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_insert" ON "participant_names_access" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('participant_names_access.insert'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_update" ON "participant_names_access" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('participant_names_access.update'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_delete" ON "participant_names_access" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('participant_names_access.delete'::public.app_permission) AS authorize));