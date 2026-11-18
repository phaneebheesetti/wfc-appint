ALTER TABLE "users" ADD COLUMN "clerk_external_id" varchar;
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_external_id_unique" UNIQUE("clerk_external_id");