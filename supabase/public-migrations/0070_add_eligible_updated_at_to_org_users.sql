ALTER TABLE "organizations_users" ADD COLUMN "eligible_updated_at" timestamp;
ALTER TABLE "organizations_users" ADD COLUMN "eligible_updated_by_user_id" uuid;
ALTER TABLE "organizations_users" ADD CONSTRAINT "organizations_users_eligible_updated_by_user_id_users_id_fk" FOREIGN KEY ("eligible_updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;