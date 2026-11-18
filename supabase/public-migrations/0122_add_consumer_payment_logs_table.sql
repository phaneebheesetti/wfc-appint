CREATE TYPE "public"."order_status" AS ENUM('NOT_DELIVERED', 'REQUESTED', 'DELIVERED');
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD');
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID');
ALTER TYPE "public"."app_permission" ADD VALUE 'consumer_payment_logs.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumer_payment_logs.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumer_payment_logs.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumer_payment_logs.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'consumer_payment_logs.delete';

COMMIT;

CREATE TABLE "consumer_payment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digital_sales_id" uuid NOT NULL,
	"consumer_id" uuid NOT NULL,
	"order_details" jsonb NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status",
	"bars_quantity" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"card_transaction_id" varchar,
	"order_status" "order_status" NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "consumer_payment_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consumer_payment_logs" ADD CONSTRAINT "consumer_payment_logs_digital_sales_id_digital_sales_information_id_fk" FOREIGN KEY ("digital_sales_id") REFERENCES "public"."digital_sales_information"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "consumer_payment_logs" ADD CONSTRAINT "consumer_payment_logs_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "consumer_payment_logs" ADD CONSTRAINT "consumer_payment_logs_card_transaction_id_payment_logs_transaction_id_fk" FOREIGN KEY ("card_transaction_id") REFERENCES "public"."payment_logs"("transaction_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "consumer_payment_logs" ADD CONSTRAINT "consumer_payment_logs_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_consumer_payment_logs_digital_sales_id" ON "consumer_payment_logs" USING btree ("digital_sales_id");
CREATE INDEX "idx_consumer_payment_logs_consumer_id" ON "consumer_payment_logs" USING btree ("consumer_id");
CREATE INDEX "idx_consumer_payment_logs_created_at" ON "consumer_payment_logs" USING btree ("created_at");
CREATE INDEX "idx_consumer_payment_logs_updated_by" ON "consumer_payment_logs" USING btree ("updated_by_user_id");
CREATE INDEX "idx_consumer_payment_logs_digital_sales_order_status" ON "consumer_payment_logs" USING btree ("digital_sales_id","order_status");
CREATE POLICY "consumer_payment_logs_all" ON "consumer_payment_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('consumer_payment_logs.all'::public.app_permission) AS authorize));
CREATE POLICY "consumer_payment_logs_select" ON "consumer_payment_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('consumer_payment_logs.select'::public.app_permission) AS authorize));
CREATE POLICY "consumer_payment_logs_insert" ON "consumer_payment_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('consumer_payment_logs.insert'::public.app_permission) AS authorize));
CREATE POLICY "consumer_payment_logs_update" ON "consumer_payment_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('consumer_payment_logs.update'::public.app_permission) AS authorize));
CREATE POLICY "consumer_payment_logs_delete" ON "consumer_payment_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('consumer_payment_logs.delete'::public.app_permission) AS authorize));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumer_payment_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumer_payment_logs TO service_role;