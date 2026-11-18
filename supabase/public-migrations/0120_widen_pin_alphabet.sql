-- Custom SQL migration file, put your code below! --

-- Widen the participant PIN keyspace to fix production statement timeouts on
-- campaigns_users inserts. The previous generator (UPPER(SUBSTRING(MD5(...), 1, 4)))
-- only produced hex characters (0-9, A-F), a 16^4 = 65,536-value keyspace that has
-- since become fully saturated, causing the uniqueness-check loop below to spin
-- until Postgres's statement_timeout kills the insert. The new alphabet
-- (digits + A-Z, excluding O to avoid 0/O confusion) gives 35^4 = 1,500,625
-- possible pins. Existing pins (hex-only) remain valid since hex is a subset
-- of this alphabet.
CREATE OR REPLACE FUNCTION generate_unique_pin_for_user()
RETURNS TRIGGER AS $$
DECLARE
    new_pin VARCHAR(4);
    pin_exists BOOLEAN;
    pin_alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
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
        -- Generate a random 4-character code from the de-ambiguated alphanumeric alphabet
        SELECT string_agg(
                 substr(pin_alphabet, floor(random() * length(pin_alphabet))::int + 1, 1),
                 ''
               )
        INTO new_pin
        FROM generate_series(1, 4);

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