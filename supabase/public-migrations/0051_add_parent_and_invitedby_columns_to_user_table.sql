ALTER TABLE "users" ADD COLUMN "parent_user_id" uuid;
ALTER TABLE "users" ADD COLUMN "invited_by_user_id" uuid;