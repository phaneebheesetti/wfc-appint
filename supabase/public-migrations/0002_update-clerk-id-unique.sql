ALTER TYPE "public"."app_role" ADD VALUE 'user' BEFORE 'admin';
ALTER TYPE "public"."app_role" ADD VALUE 'fundraiser_staff';
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");