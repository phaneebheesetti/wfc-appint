ALTER TYPE "public"."app_permission" ADD VALUE 'digital_sales_information.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'digital_sales_information.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'digital_sales_information.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'digital_sales_information.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'digital_sales_information.delete';

COMMIT;

CREATE TABLE "digital_sales_information" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"fundraiser_id" uuid NOT NULL,
	"digital_sales_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_digital_sales_information_participant_fundraiser" UNIQUE("participant_id","fundraiser_id")
);

ALTER TABLE "digital_sales_information" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "digital_sales_information" ADD CONSTRAINT "digital_sales_information_participant_id_users_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "digital_sales_information" ADD CONSTRAINT "digital_sales_information_fundraiser_id_campaigns_id_fk" FOREIGN KEY ("fundraiser_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_digital_sales_information_participant_id" ON "digital_sales_information" USING btree ("participant_id");
CREATE INDEX "idx_digital_sales_information_fundraiser_id" ON "digital_sales_information" USING btree ("fundraiser_id");
CREATE POLICY "digital_sales_information_all" ON "digital_sales_information" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('digital_sales_information.all'::public.app_permission) AS authorize));
CREATE POLICY "digital_sales_information_select" ON "digital_sales_information" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('digital_sales_information.select'::public.app_permission) AS authorize));
CREATE POLICY "digital_sales_information_insert" ON "digital_sales_information" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('digital_sales_information.insert'::public.app_permission) AS authorize));
CREATE POLICY "digital_sales_information_update" ON "digital_sales_information" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('digital_sales_information.update'::public.app_permission) AS authorize));
CREATE POLICY "digital_sales_information_delete" ON "digital_sales_information" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('digital_sales_information.delete'::public.app_permission) AS authorize));
GRANT SELECT, UPDATE ON public.digital_sales_information TO service_role;