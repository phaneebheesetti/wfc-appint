ALTER TYPE "public"."app_permission" ADD VALUE 'consumers.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumers.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumers.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumers.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumers.delete';

COMMIT;

CREATE TABLE "consumers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "consumers" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX "uq_consumers_email" ON "consumers" USING btree ("email");
CREATE INDEX "idx_consumers_created_at" ON "consumers" USING btree ("created_at");
CREATE POLICY "consumers_all" ON "consumers" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('consumers.all'::public.app_permission) AS authorize));
CREATE POLICY "consumers_select" ON "consumers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('consumers.select'::public.app_permission) AS authorize));
CREATE POLICY "consumers_insert" ON "consumers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('consumers.insert'::public.app_permission) AS authorize));
CREATE POLICY "consumers_update" ON "consumers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('consumers.update'::public.app_permission) AS authorize));
CREATE POLICY "consumers_delete" ON "consumers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('consumers.delete'::public.app_permission) AS authorize));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumers TO service_role;