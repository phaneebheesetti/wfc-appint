ALTER TYPE "public"."app_permission" ADD VALUE 'nightly_jobs.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'nightly_jobs.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'nightly_jobs.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'nightly_jobs.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'nightly_jobs.delete';

COMMIT;

CREATE TYPE "public"."nightly_jobs_status" AS ENUM('success', 'failure', 'partial-success');
CREATE TABLE "nightly_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" varchar NOT NULL,
	"last_run" timestamp with time zone,
	"last_run_status" "nightly_jobs_status",
	"last_successful_run" timestamp with time zone
);

ALTER TABLE "nightly_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ADD COLUMN "last_synced_at" timestamp with time zone;
CREATE UNIQUE INDEX "nightly_jobs_job_name_unique" ON "nightly_jobs" USING btree ("job_name");
CREATE POLICY "nightly_jobs_all" ON "nightly_jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('nightly_jobs.all'::public.app_permission) AS authorize));
CREATE POLICY "nightly_jobs_select" ON "nightly_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('nightly_jobs.select'::public.app_permission) AS authorize));
CREATE POLICY "nightly_jobs_insert" ON "nightly_jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('nightly_jobs.insert'::public.app_permission) AS authorize));
CREATE POLICY "nightly_jobs_update" ON "nightly_jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('nightly_jobs.update'::public.app_permission) AS authorize));
CREATE POLICY "nightly_jobs_delete" ON "nightly_jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('nightly_jobs.delete'::public.app_permission) AS authorize));