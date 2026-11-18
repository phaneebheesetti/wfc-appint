ALTER TABLE "prizes" ADD COLUMN "previous_prize_id" uuid;
ALTER TABLE "prizes" ADD COLUMN "next_prize_id" uuid;
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_previous_prize_id_prizes_id_fk" FOREIGN KEY ("previous_prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_next_prize_id_prizes_id_fk" FOREIGN KEY ("next_prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;