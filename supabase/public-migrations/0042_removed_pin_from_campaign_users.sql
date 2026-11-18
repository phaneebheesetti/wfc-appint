ALTER TABLE "users" ADD COLUMN "pin" varchar(5);
ALTER TABLE "campaigns_users" DROP COLUMN "pin";


-- Drop the trigger first (important: must be done before dropping the function)
DROP TRIGGER IF EXISTS set_unique_campaign_pin ON campaigns_users;

-- Drop the function
DROP FUNCTION IF EXISTS generate_unique_pin_for_campaign();


CREATE OR REPLACE FUNCTION generate_unique_pin_for_user()
RETURNS TRIGGER AS $$
DECLARE
    new_pin VARCHAR(4);
    pin_exists BOOLEAN;
BEGIN
    -- Check if the user already has a PIN
    SELECT EXISTS (
        SELECT 1
        FROM users
        WHERE id = NEW.user_id AND pin <> ''
    ) INTO pin_exists;

    -- If the user already has a PIN, do nothing
    IF pin_exists THEN
        RETURN NEW;
    END IF;

    LOOP
        -- Generate a random 4-character alphanumeric string
        new_pin := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));

        -- Check if this PIN already exists in the users table
        SELECT EXISTS (
            SELECT 1
            FROM users
            WHERE pin = new_pin
        ) INTO pin_exists;

        -- If PIN doesn't exist, use it
        IF NOT pin_exists THEN
            UPDATE users SET pin = new_pin WHERE id = NEW.user_id;
            EXIT;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_unique_user_pin
    BEFORE INSERT ON campaigns_users
    FOR EACH ROW
    EXECUTE FUNCTION generate_unique_pin_for_user();