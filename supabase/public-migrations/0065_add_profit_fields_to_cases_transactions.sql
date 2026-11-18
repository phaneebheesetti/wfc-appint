ALTER TABLE "cases_transactions" ALTER COLUMN "total_cost_cents" SET DEFAULT 0;
ALTER TABLE "cases_transactions" ALTER COLUMN "price_per_bar_cents" SET DEFAULT 0;
ALTER TABLE "cases_transactions" ALTER COLUMN "bars_per_case" SET DEFAULT 0;
ALTER TABLE "cases_transactions" ALTER COLUMN "shipping_cost_cents" SET DEFAULT 0;
ALTER TABLE "cases_transactions" ADD COLUMN "profit_per_case_cents" integer DEFAULT 0;
ALTER TABLE "cases_transactions" ADD COLUMN "total_profit_cents" integer DEFAULT 0;
