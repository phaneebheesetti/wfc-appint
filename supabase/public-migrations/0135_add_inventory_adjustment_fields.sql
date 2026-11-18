ALTER TYPE "public"."cases_transactions_type" ADD VALUE 'inventory_adjustment';
ALTER TABLE "cases_transactions" ADD COLUMN "note" text;