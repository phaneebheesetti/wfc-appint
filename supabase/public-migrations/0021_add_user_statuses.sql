CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'pending' NOT NULL;