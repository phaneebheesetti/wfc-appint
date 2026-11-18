-- Custom SQL migration file, put your code below! --

ALTER TABLE "organizations" ADD COLUMN "created_by_user_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE "organizations" ALTER COLUMN "created_by_user_id" DROP DEFAULT;