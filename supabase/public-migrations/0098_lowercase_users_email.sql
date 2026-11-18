-- Normalize users.email to lowercase on insert/update and backfill existing rows.

CREATE OR REPLACE FUNCTION public.lowercase_users_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_email_lowercase_trigger
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW
  EXECUTE FUNCTION public.lowercase_users_email();

UPDATE users
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL AND email <> LOWER(TRIM(email));

ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email IS NULL OR email = LOWER(email));