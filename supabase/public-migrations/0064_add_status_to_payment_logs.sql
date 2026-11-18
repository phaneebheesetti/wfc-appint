-- Custom SQL migration file, put your code below! --

CREATE TYPE "public"."payment_logs_status" AS ENUM('pending', 'completed', 'failed');
ALTER TABLE "payment_logs" ADD COLUMN "status" "payment_logs_status" NULL DEFAULT 'pending';
UPDATE "payment_logs" SET "status" = 'completed' WHERE "status" IS NULL;
ALTER TABLE "payment_logs" ALTER COLUMN "status" SET NOT NULL;


ALTER TABLE "payment_logs" ALTER COLUMN "type" SET DATA TYPE text;
UPDATE "payment_logs" SET "type" = 'digital' WHERE "type" = 'card';
DROP TYPE "public"."payment_logs_type";
CREATE TYPE "public"."payment_logs_type" AS ENUM('digital', 'cash');
ALTER TABLE "payment_logs" ALTER COLUMN "type" SET DATA TYPE "public"."payment_logs_type" USING "type"::"public"."payment_logs_type";
ALTER TABLE "payment_logs" ALTER COLUMN "type" SET NOT NULL;
