CREATE TYPE "public"."document_status" AS ENUM('pending', 'signed');
CREATE TYPE "public"."document_user_status" AS ENUM('pending', 'signed');
ALTER TYPE "public"."app_permission" ADD VALUE 'documents.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents.delete';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents_users.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents_users.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents_users.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents_users.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'documents_users.delete';

COMMIT;

CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"event_id" uuid,
	"uploaded_by_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "documents_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "document_user_status" DEFAULT 'pending' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "documents_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "documents_users" ADD CONSTRAINT "documents_users_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "documents_users" ADD CONSTRAINT "documents_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "documents_all" ON "documents" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('documents.all'::public.app_permission) AS authorize));
CREATE POLICY "documents_select" ON "documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('documents.select'::public.app_permission) AS authorize));
CREATE POLICY "documents_insert" ON "documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('documents.insert'::public.app_permission) AS authorize));
CREATE POLICY "documents_update" ON "documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('documents.update'::public.app_permission) AS authorize));
CREATE POLICY "documents_delete" ON "documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('documents.delete'::public.app_permission) AS authorize));
CREATE POLICY "documents_users_all" ON "documents_users" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('documents_users.all'::public.app_permission) AS authorize));
CREATE POLICY "documents_users_select" ON "documents_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('documents_users.select'::public.app_permission) AS authorize));
CREATE POLICY "documents_users_insert" ON "documents_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('documents_users.insert'::public.app_permission) AS authorize));
CREATE POLICY "documents_users_update" ON "documents_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('documents_users.update'::public.app_permission) AS authorize));
CREATE POLICY "documents_users_delete" ON "documents_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('documents_users.delete'::public.app_permission) AS authorize));