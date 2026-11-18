CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_info_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"eligible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participants" ADD CONSTRAINT "participants_contact_info_id_contact_infos_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_infos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "participants" ADD CONSTRAINT "participants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "participants_all" ON "participants" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('participants.all'::public.app_permission) AS authorize));
CREATE POLICY "participants_select" ON "participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('participants.select'::public.app_permission) AS authorize));
CREATE POLICY "participants_insert" ON "participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('participants.insert'::public.app_permission) AS authorize));
CREATE POLICY "participants_update" ON "participants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('participants.update'::public.app_permission) AS authorize));
CREATE POLICY "participants_delete" ON "participants" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('participants.delete'::public.app_permission) AS authorize));