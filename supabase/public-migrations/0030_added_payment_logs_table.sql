CREATE TYPE "public"."payment_logs_type" AS ENUM('card', 'cash');

ALTER TYPE "public"."app_permission" ADD VALUE 'payment_logs.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'payment_logs.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'payment_logs.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'payment_logs.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'payment_logs.delete';

COMMIT;

CREATE TABLE "payment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid,
	"user_id" uuid,
	"type" "payment_logs_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "payment_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "payment_logs_all" ON "payment_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('payment_logs.all'::public.app_permission) AS authorize));
CREATE POLICY "payment_logs_select" ON "payment_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('payment_logs.select'::public.app_permission) AS authorize));
CREATE POLICY "payment_logs_insert" ON "payment_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('payment_logs.insert'::public.app_permission) AS authorize));
CREATE POLICY "payment_logs_update" ON "payment_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('payment_logs.update'::public.app_permission) AS authorize));
CREATE POLICY "payment_logs_delete" ON "payment_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('payment_logs.delete'::public.app_permission) AS authorize));