CREATE TYPE "public"."participant_names_access_event_type" AS ENUM('VIEW_PARTICIPANT_NAMES', 'DOWNLOAD_REPORT');
CREATE TYPE "public"."participant_names_access_file_type" AS ENUM('CSV', 'EXCEL');
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access_logs.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access_logs.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_names_access_logs.insert';

COMMIT;

CREATE TABLE "participant_names_access_logs" (
	"user_id" uuid NOT NULL,
	"user_role" "app_role" NOT NULL,
	"campaign_id" uuid NOT NULL,
	"event_type" "participant_names_access_event_type" NOT NULL,
	"report_name" varchar(255),
	"file_type" "participant_names_access_file_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "participant_names_access_logs" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "idx_participant_names_access_logs_user_id" ON "participant_names_access_logs" USING btree ("user_id");
CREATE INDEX "idx_participant_names_access_logs_campaign_id" ON "participant_names_access_logs" USING btree ("campaign_id");
CREATE INDEX "idx_participant_names_access_logs_event_type" ON "participant_names_access_logs" USING btree ("event_type");
CREATE INDEX "idx_participant_names_access_logs_created_at" ON "participant_names_access_logs" USING btree ("created_at");
CREATE POLICY "participant_names_access_logs_all" ON "participant_names_access_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('participant_names_access_logs.all'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_logs_select" ON "participant_names_access_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('participant_names_access_logs.select'::public.app_permission) AS authorize));
CREATE POLICY "participant_names_access_logs_insert" ON "participant_names_access_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('participant_names_access_logs.insert'::public.app_permission) AS authorize));