ALTER TYPE "public"."app_permission" ADD VALUE 'participant_parent_mapping.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_parent_mapping.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_parent_mapping.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'participant_parent_mapping.delete';

COMMIT;

CREATE TABLE "participant_parent_mapping" (
	"parent_user_id" uuid NOT NULL,
	"participant_user_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_parent_mapping_parent_user_id_participant_user_id_pk" PRIMARY KEY("parent_user_id","participant_user_id")
);

ALTER TABLE "participant_parent_mapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participant_parent_mapping" ADD CONSTRAINT "participant_parent_mapping_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "participant_parent_mapping" ADD CONSTRAINT "participant_parent_mapping_participant_user_id_users_id_fk" FOREIGN KEY ("participant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "participant_parent_mapping" ADD CONSTRAINT "participant_parent_mapping_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_participant_parent_mapping_parent_user_id" ON "participant_parent_mapping" USING btree ("parent_user_id");
CREATE INDEX "idx_participant_parent_mapping_participant_user_id" ON "participant_parent_mapping" USING btree ("participant_user_id");
CREATE INDEX "idx_participant_parent_mapping_created_at" ON "participant_parent_mapping" USING btree ("created_at");
CREATE INDEX "idx_participant_parent_mapping_participant_is_primary" ON "participant_parent_mapping" USING btree ("participant_user_id","is_primary");
CREATE POLICY "participant_parent_mapping_all" ON "participant_parent_mapping" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('participant_parent_mapping.all'::public.app_permission) AS authorize));
CREATE POLICY "participant_parent_mapping_select" ON "participant_parent_mapping" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('participant_parent_mapping.select'::public.app_permission) AS authorize));
CREATE POLICY "participant_parent_mapping_insert" ON "participant_parent_mapping" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('participant_parent_mapping.insert'::public.app_permission) AS authorize));
CREATE POLICY "participant_parent_mapping_delete" ON "participant_parent_mapping" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('participant_parent_mapping.delete'::public.app_permission) AS authorize));
