-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
DECLARE
    random_bytes BYTEA;
    encryption_key text;
    secret_id uuid;
    secret_name text;
BEGIN
    random_bytes := extensions.gen_random_bytes(32);
    encryption_key := encode(random_bytes, 'base64');

    secret_name := 'encryption_key_org_' || REPLACE(NEW.id::text, '-', '_');

    secret_id := vault.create_secret(encryption_key, secret_name);

    NEW.encryption_key_secret_id := secret_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute the function before organization insert
CREATE TRIGGER before_organization_insert
    BEFORE INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_organization();
