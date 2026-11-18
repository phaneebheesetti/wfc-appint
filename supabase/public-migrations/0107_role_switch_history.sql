ALTER TYPE "public"."app_permission" ADD VALUE 'role_switch_history.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'role_switch_history.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'role_switch_history.insert';

COMMIT;

CREATE TABLE "role_switch_history" (
	"user_id" uuid NOT NULL,
	"previous_role" "app_role" NOT NULL,
	"new_role" "app_role" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "role_switch_history" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "idx_role_switch_history_user_id" ON "role_switch_history" USING btree ("user_id");
CREATE INDEX "idx_role_switch_history_timestamp" ON "role_switch_history" USING btree ("timestamp");
CREATE POLICY "role_switch_history_all" ON "role_switch_history" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('role_switch_history.all'::public.app_permission) AS authorize));
CREATE POLICY "role_switch_history_select" ON "role_switch_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('role_switch_history.select'::public.app_permission) AS authorize));
CREATE POLICY "role_switch_history_insert" ON "role_switch_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('role_switch_history.insert'::public.app_permission) AS authorize));