import { relations } from "drizzle-orm"
import { index, jsonb, pgTable, unique, uuid } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type User, users } from "./users"

export type PersonalMessageDetails = {
  message: string
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}

export type EnableSalesPageDetails = {
  is_active: boolean
  url: string
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}

export type InventoryDetails = {
  cases_checked_out: number
  total_bars: number
  sold_in_person: number
  sold_online: number
  marked_done: boolean
  created_at: string
  updated_at: string | null
  created_by: string
  updated_by: string | null
}

/**
 * The persisted "Set Up Your Personal Sales Page" progress for a participant within a
 * fundraiser. Step completion is derived from this blob (see the router / services).
 */
export type DigitalSalesDetails = {
  personal_message?: PersonalMessageDetails
  inventory_details?: InventoryDetails
  enable_sales_page?: EnableSalesPageDetails
}

export const digitalSalesInformation = pgTable(
  "digital_sales_information",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => users.id),
    fundraiserId: uuid("fundraiser_id")
      .notNull()
      .references(() => campaigns.id),

    digitalSalesDetails: jsonb("digital_sales_details").$type<DigitalSalesDetails>().notNull().default({}),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("digital_sales_information"),
    // one sales page per participant per fundraiser
    unique("uq_digital_sales_information_participant_fundraiser").on(table.participantId, table.fundraiserId),
    index("idx_digital_sales_information_participant_id").on(table.participantId),
    index("idx_digital_sales_information_fundraiser_id").on(table.fundraiserId),
  ]
).enableRLS()

export type DigitalSalesInformation = typeof digitalSalesInformation.$inferSelect & {
  participant?: User | null
  fundraiser?: Campaign | null
}

export type DigitalSalesInformationSelect = typeof digitalSalesInformation.$inferSelect
export type DigitalSalesInformationInsert = typeof digitalSalesInformation.$inferInsert

export const digitalSalesInformationRelations = relations(digitalSalesInformation, ({ one }) => ({
  participant: one(users, {
    fields: [digitalSalesInformation.participantId],
    references: [users.id],
  }),
  fundraiser: one(campaigns, {
    fields: [digitalSalesInformation.fundraiserId],
    references: [campaigns.id],
  }),
}))
