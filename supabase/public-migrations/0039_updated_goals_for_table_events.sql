CREATE TYPE "public"."event_goal_types" AS ENUM('first_case_checkout', 'first_payment_turned_in', 'case_payment', 'all_participants', 'prize_qualification');
ALTER TABLE "events" ADD COLUMN "cases_goal" integer;
ALTER TABLE "events" ADD COLUMN "goal_type" "event_goal_types" DEFAULT 'all_participants' NOT NULL;