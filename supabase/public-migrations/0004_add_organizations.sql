CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_info_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_contact_info_id_contact_infos_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_infos"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "organizations_select" ON "organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT authorize('organizations.select'::app_permission) AS authorize));
CREATE POLICY "organizations_insert" ON "organizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT authorize('organizations.insert'::app_permission) AS authorize));
CREATE POLICY "organizations_update" ON "organizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT authorize('organizations.update'::app_permission) AS authorize));
CREATE POLICY "organizations_delete" ON "organizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT authorize('organizations.delete'::app_permission) AS authorize));
