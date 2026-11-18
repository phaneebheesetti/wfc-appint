import { relations, sql } from "drizzle-orm"
import { jsonb, pgPolicy, pgTable, uuid } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { type CampaignSetupProgress } from "@/constants/onboarding"

import { type Campaign, campaigns } from "./campaigns"

export const campaignsProgress = pgTable(
  "campaigns_progress",
  {
    campaignId: uuid("campaign_id")
      .primaryKey()
      .notNull()
      .references(() => campaigns.id),

    setupProgress: jsonb("setup_progress").$type<CampaignSetupProgress>(),
  },
  () => [
    pgPolicy("campaigns_progress_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('campaigns_progress.all'::public.app_permission) AS authorize)`,
    }),

    pgPolicy("campaigns_progress_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('campaigns_progress.select'::public.app_permission) AS authorize)`,
    }),

    pgPolicy("campaigns_progress_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('campaigns_progress.insert'::public.app_permission) AS authorize)`,
    }),

    pgPolicy("campaigns_progress_update", {
      as: "permissive",
      to: authenticatedRole,
      for: "update",
      using: sql`(SELECT public.authorize('campaigns_progress.update'::public.app_permission) AS authorize)`,
    }),

    pgPolicy("campaigns_progress_delete", {
      as: "permissive",
      to: authenticatedRole,
      for: "delete",
      using: sql`(SELECT public.authorize('campaigns_progress.delete'::public.app_permission) AS authorize)`,
    }),
  ]
).enableRLS()

export type CampaignProgress = typeof campaignsProgress.$inferSelect & {
  campaign?: Campaign | null
}

export type CampaignProgressSelect = typeof campaignsProgress.$inferSelect

export type CampaignProgressInsert = typeof campaignsProgress.$inferInsert

export const campaignsProgressRelations = relations(campaignsProgress, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignsProgress.campaignId],
    references: [campaigns.id],
  }),
}))
