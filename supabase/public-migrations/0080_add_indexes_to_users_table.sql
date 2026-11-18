DROP INDEX "idx_users_contact_info_id";
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");
CREATE INDEX "idx_users_pin" ON "users" USING btree ("pin");
CREATE INDEX "idx_users_full_name" ON "users" USING btree ("full_name");
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone");
CREATE INDEX "idx_users_grade" ON "users" USING btree ("grade");
CREATE INDEX "idx_users_teacher_name" ON "users" USING btree ("teacher_name");