ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_external_id_unique";
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";
ALTER TABLE "users" DROP CONSTRAINT "users_phone_unique";
CREATE INDEX "idx_users_clerk_id" ON "users" USING btree ("clerk_id");
CREATE INDEX "idx_users_clerk_external_id" ON "users" USING btree ("clerk_external_id");
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");
CREATE UNIQUE INDEX "users_email_role_unique" ON "users" USING btree ("email","role") WHERE "users"."deleted_at" IS NULL AND "users"."email" IS NOT NULL;
CREATE UNIQUE INDEX "users_phone_role_unique" ON "users" USING btree ("phone","role") WHERE "users"."deleted_at" IS NULL AND "users"."phone" IS NOT NULL;