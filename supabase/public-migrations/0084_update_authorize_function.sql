-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.authorize(requested_permission app_permission)
RETURNS boolean
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS(
    SELECT 1
    FROM public.role_permissions
    WHERE permission = requested_permission
      AND role = (
        CASE
          WHEN nullif(((auth.jwt() ->> 'user_metadata')::json->>'role'), '') IN (SELECT unnest(enum_range(NULL::public.app_role)::text[]))
          THEN nullif(((auth.jwt() ->> 'user_metadata')::json->>'role'), '')::public.app_role
          ELSE NULL
        END
      )
  );
$function$;
