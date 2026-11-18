ALTER TABLE "cases_transactions" ADD COLUMN "parent_transaction_id" uuid;
CREATE INDEX "idx_cases_transactions_parent_transaction_id" ON "cases_transactions" USING btree ("parent_transaction_id");