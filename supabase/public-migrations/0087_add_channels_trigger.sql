-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION public.handle_new_channel()
RETURNS TRIGGER AS $$
DECLARE
    channel_name text;
    channel_id uuid;
BEGIN
    channel_name := 'user-' || REPLACE(NEW.user_id::text, '-', '_') || '-org-' || REPLACE(NEW.organization_id::text, '-', '_');

    INSERT INTO channels (name, organization_id) VALUES (channel_name, NEW.organization_id) RETURNING id INTO channel_id;

    INSERT INTO channels_users (channel_id, user_id) VALUES (channel_id, NEW.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute the function before organization users insert
CREATE TRIGGER before_organization_users_insert
    BEFORE INSERT ON organizations_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_channel();
