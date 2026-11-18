-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.read_secret(secret_id uuid)
RETURNS text AS $$
DECLARE
  secret text;
BEGIN
    if current_setting('role') != 'service_role' then
        raise exception 'authentication required';
    end if;

    select vault.decrypted_secrets.decrypted_secret
    into secret
    from vault.decrypted_secrets
    where vault.decrypted_secrets.id = secret_id;

    return secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;