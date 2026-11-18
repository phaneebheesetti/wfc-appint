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