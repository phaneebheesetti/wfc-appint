DROP INDEX "idx_organizations_contact_info_id";
DROP INDEX "idx_organizations_encryption_key_secret_id";
DROP INDEX "idx_organizations_created_at";
DROP INDEX "idx_organizations_creator_created_at";
CREATE INDEX "idx_organizations_admin_user_id" ON "organizations" USING btree ("admin_user_id");
CREATE INDEX "idx_organizations_name" ON "organizations" USING btree ("name");
CREATE INDEX "idx_organizations_street" ON "organizations" USING btree ("street");