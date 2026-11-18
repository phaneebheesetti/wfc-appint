-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.read_secrets(secret_ids uuid[])
RETURNS TABLE(id uuid, secret text) AS $$
BEGIN
    if current_setting('role') != 'service_role' then
        raise exception 'authentication required';
    end if;

    return query
        select vault.decrypted_secrets.id, vault.decrypted_secrets.decrypted_secret
        from vault.decrypted_secrets
        where vault.decrypted_secrets.id = any(secret_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
