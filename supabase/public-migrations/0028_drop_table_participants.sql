DROP POLICY "participants_all" ON "participants" CASCADE;
DROP POLICY "participants_select" ON "participants" CASCADE;
DROP POLICY "participants_insert" ON "participants" CASCADE;
DROP POLICY "participants_update" ON "participants" CASCADE;
DROP POLICY "participants_delete" ON "participants" CASCADE;
DROP TABLE "participants" CASCADE;
-- ALTER TABLE "cases_transactions" DROP CONSTRAINT "cases_transactions_participant_id_participants_id_fk";

ALTER TABLE "cases_transactions" ADD COLUMN "user_id" uuid;
ALTER TABLE "cases_transactions" ADD CONSTRAINT "cases_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cases_transactions" DROP COLUMN "participant_id";
