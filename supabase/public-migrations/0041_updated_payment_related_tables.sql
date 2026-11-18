ALTER TABLE "payment_logs" ADD COLUMN "transaction_id" varchar;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_transaction_id_unique" UNIQUE("transaction_id");

ALTER TABLE "campaigns_users" ADD COLUMN "pin" varchar(4);

CREATE OR REPLACE FUNCTION generate_unique_pin_for_campaign()
RETURNS TRIGGER AS $$
DECLARE
    new_pin VARCHAR(4);
    pin_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 4-digit number
        new_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        -- Check if this PIN already exists for this campaign
        SELECT EXISTS (
            SELECT 1
            FROM campaigns_users
            WHERE campaign_id = NEW.campaign_id AND pin = new_pin
        ) INTO pin_exists;

        -- If PIN doesn't exist for this campaign, use it
        IF NOT pin_exists THEN
            NEW.pin := new_pin;
            EXIT;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_unique_campaign_pin
    BEFORE INSERT ON campaigns_users
    FOR EACH ROW
    EXECUTE FUNCTION generate_unique_pin_for_campaign();