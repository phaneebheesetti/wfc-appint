ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_progress.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_progress.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_progress.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_progress.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_progress.delete';

COMMIT;

CREATE TABLE "campaigns_progress" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"setup_progress" jsonb
);

ALTER TABLE "campaigns_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns_progress" ADD CONSTRAINT "campaigns_progress_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "campaigns_progress_all" ON "campaigns_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('campaigns_progress.all'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_progress_select" ON "campaigns_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('campaigns_progress.select'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_progress_insert" ON "campaigns_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('campaigns_progress.insert'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_progress_update" ON "campaigns_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('campaigns_progress.update'::public.app_permission) AS authorize));
CREATE POLICY "campaigns_progress_delete" ON "campaigns_progress" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('campaigns_progress.delete'::public.app_permission) AS authorize));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns_progress TO authenticated;