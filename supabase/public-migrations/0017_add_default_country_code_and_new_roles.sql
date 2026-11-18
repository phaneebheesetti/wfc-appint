ALTER TABLE "contact_infos" ALTER COLUMN "country" SET DEFAULT 'US';
ALTER TABLE "public"."role_permissions" ALTER COLUMN "role" SET DATA TYPE text;
DROP TYPE "public"."app_role";
CREATE TYPE "public"."app_role" AS ENUM('user', 'admin', 'wfc_admin', 'sales_representative', 'organization_admin', 'organization_staff');
ALTER TABLE "public"."role_permissions" ALTER COLUMN "role" SET DATA TYPE "public"."app_role" USING "role"::"public"."app_role";