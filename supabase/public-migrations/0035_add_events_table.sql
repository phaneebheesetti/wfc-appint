ALTER TYPE "public"."app_permission" ADD VALUE 'events.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'events.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'events.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'events.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'events.delete';

COMMIT;

CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "events_all" ON "events" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('events.all'::public.app_permission) AS authorize));
CREATE POLICY "events_select" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('events.select'::public.app_permission) AS authorize));
CREATE POLICY "events_insert" ON "events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('events.insert'::public.app_permission) AS authorize));
CREATE POLICY "events_update" ON "events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('events.update'::public.app_permission) AS authorize));
CREATE POLICY "events_delete" ON "events" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('events.delete'::public.app_permission) AS authorize));