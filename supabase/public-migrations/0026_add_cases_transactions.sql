CREATE TYPE "public"."cases_transactions_type" AS ENUM('delivered', 'checkout');
ALTER TYPE "public"."app_permission" ADD VALUE 'cases_transactions.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'cases_transactions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'cases_transactions.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'cases_transactions.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'cases_transactions.delete';

COMMIT;

CREATE TABLE "cases_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid,
	"participant_id" uuid,
	"type" "cases_transactions_type" NOT NULL,
	"quantity" integer NOT NULL,
	"price_per_case_cents" integer,
	"total_price_cents" integer,
	"cost_per_case_cents" integer,
	"total_cost_cents" integer,
	"shipping_cost_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "cases_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cases_transactions" ADD CONSTRAINT "cases_transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cases_transactions" ADD CONSTRAINT "cases_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cases_transactions" ADD CONSTRAINT "cases_transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cases_transactions" ADD CONSTRAINT "cases_transactions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
CREATE POLICY "cases_transactions_all" ON "cases_transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('cases_transactions.all'::public.app_permission) AS authorize));
CREATE POLICY "cases_transactions_select" ON "cases_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('cases_transactions.select'::public.app_permission) AS authorize));
CREATE POLICY "cases_transactions_insert" ON "cases_transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('cases_transactions.insert'::public.app_permission) AS authorize));
CREATE POLICY "cases_transactions_update" ON "cases_transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('cases_transactions.update'::public.app_permission) AS authorize));
CREATE POLICY "cases_transactions_delete" ON "cases_transactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('cases_transactions.delete'::public.app_permission) AS authorize));
