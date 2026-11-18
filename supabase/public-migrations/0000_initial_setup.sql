-- Custom SQL migration file, put your code below! --

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wfc') THEN
    CREATE ROLE "wfc" WITH LOGIN;
  END IF;
END
$$;
grant authenticated to "wfc";

CREATE TYPE "public"."app_permission" AS ENUM(
  'campaigns.select',
  'campaigns.insert',
  'campaigns.update',
  'campaigns.delete',
  'contact_infos.select',
  'contact_infos.insert',
  'contact_infos.update',
  'contact_infos.delete',
  'role_permissions.select',
  'role_permissions.insert',
  'role_permissions.update',
  'role_permissions.delete',
  'users.select',
  'users.insert',
  'users.update',
  'users.delete'
);
CREATE TYPE "public"."app_role" AS ENUM('admin', 'sales_representative');

CREATE TABLE "role_permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"role" "app_role" NOT NULL,
	"permission" "app_permission" NOT NULL
);

CREATE UNIQUE INDEX "role_permission_idx" ON "role_permissions" USING btree ("role","permission");

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.authorize(requested_permission app_permission)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bind_permissions int;
  user_role public.app_role;
begin
  select
    CASE
      WHEN nullif(((auth.jwt() ->> 'user_metadata')::json->>'role'), '') IN (SELECT unnest(enum_range(NULL::public.app_role)::text[]))
      THEN nullif(((auth.jwt() ->> 'user_metadata')::json->>'role'), '')::public.app_role
      ELSE NULL
    END into user_role;

  select count(*)
  into bind_permissions
  from public.role_permissions
  where role_permissions.permission = requested_permission
    and role_permissions.role = user_role;

  return bind_permissions > 0;
end;
$function$
;

CREATE POLICY "role_permissions_select" ON "role_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT authorize('role_permissions.select'::app_permission) AS authorize));
CREATE POLICY "role_permissions_insert" ON "role_permissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT authorize('role_permissions.insert'::app_permission) AS authorize));
CREATE POLICY "role_permissions_update" ON "role_permissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT authorize('role_permissions.update'::app_permission) AS authorize));
CREATE POLICY "role_permissions_delete" ON "role_permissions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT authorize('role_permissions.delete'::app_permission) AS authorize));
