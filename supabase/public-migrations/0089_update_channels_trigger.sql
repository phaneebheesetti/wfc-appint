-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.handle_new_channel()
RETURNS TRIGGER AS $$
DECLARE
    channel_name text;
    channel_id uuid;
BEGIN
    SELECT full_name INTO channel_name FROM users WHERE id = NEW.user_id;

    INSERT INTO channels (name, organization_id) VALUES (channel_name, NEW.organization_id) RETURNING id INTO channel_id;

    INSERT INTO channels_users (channel_id, user_id) VALUES (channel_id, NEW.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
