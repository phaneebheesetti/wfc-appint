ALTER TABLE "public"."prizes" ALTER COLUMN "goal_type" SET DATA TYPE text;
ALTER TABLE "public"."prizes" ALTER COLUMN "goal_type" DROP DEFAULT;
DROP TYPE "public"."prize_levels";
CREATE TYPE "public"."prize_levels" AS ENUM('first_case_checkout', 'first_payment_turned_in', 'case_payment', 'all_participants');
ALTER TABLE "public"."prizes" ALTER COLUMN "goal_type" SET DATA TYPE "public"."prize_levels" USING "goal_type"::"public"."prize_levels";