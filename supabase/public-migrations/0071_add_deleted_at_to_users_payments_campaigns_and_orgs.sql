ALTER TABLE "campaigns" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "organizations" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "payment_logs" ADD COLUMN "deleted_at" timestamp;