ALTER TABLE "campaigns" ADD COLUMN "prize_template_name" text;
ALTER TABLE "prizes" ADD COLUMN "prize_template_name" text;
CREATE INDEX "idx_prizes_campaign_prize_template_slug" ON "prizes" USING btree ("campaign_id","prize_template_name");