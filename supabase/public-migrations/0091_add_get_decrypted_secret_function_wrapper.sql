-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION get_decrypted_secret(secret_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE id = secret_id;
$$;

DROP VIEW IF EXISTS users_encrypted;

CREATE VIEW users_encrypted AS
SELECT
    u.id,
    u.clerk_id,
    u.contact_info_id,
    u.status,
    u.role,
    u.pin,
    encrypt_sensitive_data(
        u.first_name,
        get_decrypted_secret(current_setting('app.current_organization_encryption_key_secret_id')::uuid)
    ) AS first_name,
    encrypt_sensitive_data(
        u.last_name,
        get_decrypted_secret(current_setting('app.current_organization_encryption_key_secret_id')::uuid)
    ) AS last_name,
    encrypt_sensitive_data(
        u.full_name,
        get_decrypted_secret(current_setting('app.current_organization_encryption_key_secret_id')::uuid)
    ) AS full_name,
    encrypt_sensitive_data(
        u.email,
        get_decrypted_secret(current_setting('app.current_organization_encryption_key_secret_id')::uuid)
    ) AS email,
    encrypt_sensitive_data(
        u.phone,
        get_decrypted_secret(current_setting('app.current_organization_encryption_key_secret_id')::uuid)
    ) AS phone,
    u.grade,
    u.teacher_name,
    true AS encrypted,
    u.parent_user_id,
    u.invited_by_user_id,
    u.encryption_key_secret_id,
    u.clerk_invitation_url,
    u.clerk_invitation_sent_at,
    u.deleted_at,
    u.created_at,
    u.updated_at
FROM users u;
