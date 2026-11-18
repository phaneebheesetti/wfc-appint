ALTER TABLE "organizations" ALTER COLUMN "contact_info_id" DROP NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "name" varchar;
ALTER TABLE "organizations" ADD COLUMN "street" varchar;
ALTER TABLE "organizations" ADD COLUMN "city" varchar;
ALTER TABLE "organizations" ADD COLUMN "postal_code" varchar;
ALTER TABLE "organizations" ADD COLUMN "state" varchar;
ALTER TABLE "organizations" ADD COLUMN "country" varchar DEFAULT 'US';