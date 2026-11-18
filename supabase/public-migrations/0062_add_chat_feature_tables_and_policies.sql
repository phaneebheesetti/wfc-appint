ALTER TYPE "public"."app_permission" ADD VALUE 'channels.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels.delete';
ALTER TYPE "public"."app_permission" ADD VALUE 'channel_messages.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'channel_messages.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'channel_messages.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'channel_messages.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'channel_messages.delete';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels_users.all';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels_users.select';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels_users.insert';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels_users.update';
ALTER TYPE "public"."app_permission" ADD VALUE 'channels_users.delete';

COMMIT;

CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "channels_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "channels_users" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "channel_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"ably_message_id" varchar(255),
	"ably_raw_message" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

ALTER TABLE "channel_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channels" ADD CONSTRAINT "channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "channels_users" ADD CONSTRAINT "channels_users_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "channels_users" ADD CONSTRAINT "channels_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_channels_organization_id" ON "channels" USING btree ("organization_id");
CREATE UNIQUE INDEX "channels_users_channel_id_user_id_index" ON "channels_users" USING btree ("channel_id","user_id");
CREATE INDEX "idx_channels_users_channel_id" ON "channels_users" USING btree ("channel_id");
CREATE INDEX "idx_channels_users_user_id" ON "channels_users" USING btree ("user_id");
CREATE INDEX "idx_channel_messages_channel_id" ON "channel_messages" USING btree ("channel_id");
CREATE INDEX "idx_channel_messages_user_id" ON "channel_messages" USING btree ("user_id");
CREATE POLICY "channels_all" ON "channels" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('channels.all'::public.app_permission) AS authorize));
CREATE POLICY "channels_select" ON "channels" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('channels.select'::public.app_permission) AS authorize));
CREATE POLICY "channels_insert" ON "channels" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('channels.insert'::public.app_permission) AS authorize));
CREATE POLICY "channels_update" ON "channels" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('channels.update'::public.app_permission) AS authorize));
CREATE POLICY "channels_delete" ON "channels" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('channels.delete'::public.app_permission) AS authorize));
CREATE POLICY "channels_users_all" ON "channels_users" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('channels_users.all'::public.app_permission) AS authorize));
CREATE POLICY "channels_users_select" ON "channels_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('channels_users.select'::public.app_permission) AS authorize));
CREATE POLICY "channels_users_insert" ON "channels_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('channels_users.insert'::public.app_permission) AS authorize));
CREATE POLICY "channels_users_update" ON "channels_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('channels_users.update'::public.app_permission) AS authorize));
CREATE POLICY "channels_users_delete" ON "channels_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('channels_users.delete'::public.app_permission) AS authorize));
CREATE POLICY "channel_messages_all" ON "channel_messages" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT public.authorize('channel_messages.all'::public.app_permission) AS authorize));
CREATE POLICY "channel_messages_select" ON "channel_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT public.authorize('channel_messages.select'::public.app_permission) AS authorize));
CREATE POLICY "channel_messages_insert" ON "channel_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT public.authorize('channel_messages.insert'::public.app_permission) AS authorize));
CREATE POLICY "channel_messages_update" ON "channel_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT public.authorize('channel_messages.update'::public.app_permission) AS authorize));
CREATE POLICY "channel_messages_delete" ON "channel_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT public.authorize('channel_messages.delete'::public.app_permission) AS authorize));