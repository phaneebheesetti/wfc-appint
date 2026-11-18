-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.handle_new_contact_info()
RETURNS TRIGGER AS $$
DECLARE
    encryption_key text;
    column_name text;
BEGIN
    IF NEW.encrypted = false THEN
        RETURN NEW;
    END IF;

    SELECT vault.decrypted_secrets.decrypted_secret
        INTO encryption_key
        FROM vault.decrypted_secrets
        WHERE vault.decrypted_secrets.id = current_setting('app.current_organization_encryption_key_secret_id')::uuid;

    NEW.first_name = encrypt_sensitive_data(NEW.first_name, encryption_key);
    NEW.last_name = encrypt_sensitive_data(NEW.last_name, encryption_key);
    NEW.full_name = encrypt_sensitive_data(NEW.full_name, encryption_key);
    NEW.street = encrypt_sensitive_data(NEW.street, encryption_key);
    NEW.city = encrypt_sensitive_data(NEW.city, encryption_key);
    NEW.postal_code = encrypt_sensitive_data(NEW.postal_code, encryption_key);
    NEW.state = encrypt_sensitive_data(NEW.state, encryption_key);
    NEW.country = encrypt_sensitive_data(NEW.country, encryption_key);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_update_contact_info()
RETURNS TRIGGER AS $$
DECLARE
    encryption_key text;
BEGIN
    IF NEW.encrypted = false THEN
        RETURN NEW;
    END IF;

    SELECT vault.decrypted_secrets.decrypted_secret
        INTO encryption_key
        FROM vault.decrypted_secrets
        WHERE vault.decrypted_secrets.id = current_setting('app.current_organization_encryption_key_secret_id')::uuid;

    -- Only re-encrypt fields that have changed
    IF NEW.first_name <> OLD.first_name THEN
        NEW.first_name = encrypt_sensitive_data(NEW.first_name, encryption_key);
    END IF;

    IF NEW.last_name <> OLD.last_name THEN
        NEW.last_name = encrypt_sensitive_data(NEW.last_name, encryption_key);
    END IF;

    IF NEW.full_name <> OLD.full_name THEN
        NEW.full_name = encrypt_sensitive_data(NEW.full_name, encryption_key);
    END IF;

    IF NEW.street <> OLD.street THEN
        NEW.street = encrypt_sensitive_data(NEW.street, encryption_key);
    END IF;

    IF NEW.city <> OLD.city THEN
        NEW.city = encrypt_sensitive_data(NEW.city, encryption_key);
    END IF;

    IF NEW.postal_code <> OLD.postal_code THEN
        NEW.postal_code = encrypt_sensitive_data(NEW.postal_code, encryption_key);
    END IF;

    IF NEW.state <> OLD.state THEN
        NEW.state = encrypt_sensitive_data(NEW.state, encryption_key);
    END IF;

    IF NEW.country <> OLD.country THEN
        NEW.country = encrypt_sensitive_data(NEW.country, encryption_key);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
