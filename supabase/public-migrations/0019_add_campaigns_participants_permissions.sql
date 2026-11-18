ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_participants.all' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_participants.select' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_participants.insert' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_participants.update' BEFORE 'campaigns.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'campaigns_participants.delete' BEFORE 'campaigns.all';

COMMIT;
