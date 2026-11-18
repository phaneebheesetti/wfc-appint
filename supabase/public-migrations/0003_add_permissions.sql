ALTER TYPE "public"."app_permission" ADD VALUE 'organizations.select' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations.insert' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations.update' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations.delete' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participants.select' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participants.insert' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participants.update' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participants.delete' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_role" ADD VALUE 'wfc_admin' BEFORE 'sales_representative';
ALTER TABLE "role_permissions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "role_permissions" ADD COLUMN "updated_at" timestamp with time zone;

COMMIT;
