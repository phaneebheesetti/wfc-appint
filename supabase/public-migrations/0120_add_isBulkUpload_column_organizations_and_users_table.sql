ALTER TABLE "organizations" ADD COLUMN "is_bulk_upload" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "is_bulk_upload" boolean DEFAULT false NOT NULL;