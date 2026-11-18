CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"profit_share_percentage" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "check_profit_share_percentage" CHECK ("campaigns"."profit_share_percentage" >= 0 AND "campaigns"."profit_share_percentage" <= 100)
);

ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "contact_infos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"full_name" varchar,
	"email" varchar,
	"phone" varchar,
	"street" varchar,
	"city" varchar,
	"postal_code" varchar,
	"state" varchar,
	"country" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "check_email_format" CHECK ("contact_infos"."email" ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$'),
	CONSTRAINT "check_phone" CHECK ("contact_infos"."phone" ~* '^+?[1-9]d{1,14}$')
);

ALTER TABLE "contact_infos" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar NOT NULL,
	"contact_info_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ADD CONSTRAINT "users_contact_info_id_contact_infos_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_infos"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "campaigns_select" ON "campaigns" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT authorize('campaigns.select'::app_permission) AS authorize));
CREATE POLICY "campaigns_insert" ON "campaigns" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT authorize('campaigns.insert'::app_permission) AS authorize));
CREATE POLICY "campaigns_update" ON "campaigns" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT authorize('campaigns.update'::app_permission) AS authorize));
CREATE POLICY "campaigns_delete" ON "campaigns" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT authorize('campaigns.delete'::app_permission) AS authorize));
CREATE POLICY "contact_infos_select" ON "contact_infos" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT authorize('contact_infos.select'::app_permission) AS authorize));
CREATE POLICY "contact_infos_insert" ON "contact_infos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT authorize('contact_infos.insert'::app_permission) AS authorize));
CREATE POLICY "contact_infos_update" ON "contact_infos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT authorize('contact_infos.update'::app_permission) AS authorize));
CREATE POLICY "contact_infos_delete" ON "contact_infos" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT authorize('contact_infos.delete'::app_permission) AS authorize));
CREATE POLICY "users_select" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT authorize('users.select'::app_permission) AS authorize));
CREATE POLICY "users_insert" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT authorize('users.insert'::app_permission) AS authorize));
CREATE POLICY "users_update" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT authorize('users.update'::app_permission) AS authorize));
CREATE POLICY "users_delete" ON "users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT authorize('users.delete'::app_permission) AS authorize));