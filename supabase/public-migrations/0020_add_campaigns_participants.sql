CREATE TABLE "campaigns_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "campaigns_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns_participants" ADD CONSTRAINT "campaigns_participants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campaigns_participants" ADD CONSTRAINT "campaigns_participants_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "campaigns_participants_all" ON "campaigns_participants" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('campaigns_participants.all'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_participants_select" ON "campaigns_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('campaigns_participants.select'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_participants_insert" ON "campaigns_participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('campaigns_participants.insert'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_participants_update" ON "campaigns_participants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('campaigns_participants.update'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_participants_delete" ON "campaigns_participants" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('campaigns_participants.delete'::public.app_permission) AS authorize));