ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns.all' BEFORE 'campaigns.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'contact_infos.all' BEFORE 'contact_infos.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'organizations.all' BEFORE 'organizations.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participants.all' BEFORE 'participants.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'role_permissions.all' BEFORE 'role_permissions.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'users.all' BEFORE 'users.select';