-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data text, key text)
RETURNS text AS $$
DECLARE
    encrypted_data bytea;
BEGIN
  IF data IS NULL OR data = '' OR key IS NULL OR key = '' THEN
    RETURN data;
  END IF;

  encrypted_data := extensions.pgp_sym_encrypt(data, key, 'cipher-algo=aes256');

  RETURN encode(encrypted_data, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data bytea, key text) RETURNS text AS $$
DECLARE
    decoded_data text;
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' OR key IS NULL OR key = '' THEN
    RETURN encrypted_data;
  END IF;

  decoded_data := decode(encrypted_data, 'base64');

  RETURN extensions.pgp_sym_decrypt(decoded_data, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
