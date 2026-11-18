-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.handle_user_full_name_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
        UPDATE channels
        SET name = NEW.full_name
        WHERE id IN (
            SELECT channel_id FROM channels_users WHERE user_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the channel's display name in sync whenever the participant it was created for is renamed.
CREATE TRIGGER after_users_full_name_update
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_full_name_update();
