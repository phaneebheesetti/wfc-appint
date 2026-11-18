ALTER TABLE "users" ADD COLUMN "confirm_email_url" varchar;
ALTER TABLE "users" ADD COLUMN "report_email_url" varchar;
ALTER TABLE "users" ADD COLUMN "email_verification_sent_at" timestamp;