CREATE INDEX "idx_contact_infos_phone" ON "contact_infos" USING btree ("phone");
ALTER TABLE "contact_infos" ADD CONSTRAINT "contact_infos_email_unique" UNIQUE("email");
ALTER TABLE "contact_infos" ADD CONSTRAINT "contact_infos_phone_unique" UNIQUE("phone");