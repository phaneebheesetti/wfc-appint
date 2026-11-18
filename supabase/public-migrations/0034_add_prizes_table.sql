ALTER TYPE "public"."app_permission" ADD VALUE 'prizes.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'prizes.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'prizes.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'prizes.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'prizes.delete';

COMMIT;

CREATE TABLE "prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "prizes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "prizes_all" ON "prizes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('prizes.all'::public.app_permission) AS authorize));
CREATE POLICY "prizes_select" ON "prizes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('prizes.select'::public.app_permission) AS authorize));
CREATE POLICY "prizes_insert" ON "prizes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('prizes.insert'::public.app_permission) AS authorize));
CREATE POLICY "prizes_update" ON "prizes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('prizes.update'::public.app_permission) AS authorize));
CREATE POLICY "prizes_delete" ON "prizes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('prizes.delete'::public.app_permission) AS authorize));