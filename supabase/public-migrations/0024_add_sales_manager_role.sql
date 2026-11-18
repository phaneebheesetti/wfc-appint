ALTER TYPE "public"."app_role" ADD VALUE 'sales_manager' BEFORE 'sales_representative';
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_organizations_id_fk";

ALTER TABLE "users" DROP COLUMN "organization_id";