ALTER TABLE "contact_infos" DROP CONSTRAINT "check_phone";
ALTER TABLE "contact_infos" DROP CONSTRAINT "check_email_format";
ALTER TABLE "contact_infos" ADD CONSTRAINT "check_email_format" CHECK ("contact_infos"."email" ~ E'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');