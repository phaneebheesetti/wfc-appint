ALTER TYPE "public"."app_permission" ADD VALUE 'organizations_users.all' BEFORE 'campaigns_participants.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations_users.select' BEFORE 'campaigns_participants.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations_users.insert' BEFORE 'campaigns_participants.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations_users.update' BEFORE 'campaigns_participants.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations_users.delete' BEFORE 'campaigns_participants.all';

COMMIT;

CREATE TABLE "organizations_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "organizations_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations_users" ADD CONSTRAINT "organizations_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "organizations_users" ADD CONSTRAINT "organizations_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "organizations_users_all" ON "organizations_users" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('organizations_users.all'::public.app_permission) AS authorize));
CREATE POLICY "organizations_users_select" ON "organizations_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('organizations_users.select'::public.app_permission) AS authorize));
CREATE POLICY "organizations_users_insert" ON "organizations_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('organizations_users.insert'::public.app_permission) AS authorize));
CREATE POLICY "organizations_users_update" ON "organizations_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('organizations_users.update'::public.app_permission) AS authorize));
CREATE POLICY "organizations_users_delete" ON "organizations_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('organizations_users.delete'::public.app_permission) AS authorize));

COMMIT;
