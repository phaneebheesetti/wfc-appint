import { relations } from "drizzle-orm"
import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { DocumentsTypeEnum } from "@/constants/documents"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type DocumentUser, documentsUsers } from "./documents-users"
import { type Event, events } from "./events"
import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const documentTypeEnum = pgEnum("document_type", Object.values(DocumentsTypeEnum) as [string, ...string[]])

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    eventId: uuid("event_id").references(() => events.id),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),

    name: text("name").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    type: documentTypeEnum("type").notNull().default(DocumentsTypeEnum.DOCUMENT),

    ...timestamps,
  },

  table => [
    ...getDefaultPolicies("documents"),
    // foreign key indexes
    index("idx_documents_organization_id").on(table.organizationId),
    index("idx_documents_campaign_id").on(table.campaignId),
    index("idx_documents_event_id").on(table.eventId),
    index("idx_documents_uploaded_by_user_id").on(table.uploadedByUserId),
    // composite indexes for campaigns
    index("idx_documents_campaign_name").on(table.campaignId, table.name),
    index("idx_documents_campaign_type").on(table.campaignId, table.type),
    index("idx_documents_campaign_created_at").on(table.campaignId, table.createdAt),
  ]
).enableRLS()

export type Document = typeof documents.$inferSelect & {
  organization?: Organization
  campaign?: Campaign
  event?: Event | null
  uploadedByUser?: User
  documentsUsers?: DocumentUser[]
}

export type DocumentSelect = typeof documents.$inferSelect
export type DocumentInsert = typeof documents.$inferInsert

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  campaign: one(campaigns, {
    fields: [documents.campaignId],
    references: [campaigns.id],
  }),
  event: one(events, {
    fields: [documents.eventId],
    references: [events.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedByUserId],
    references: [users.id],
  }),
  documentsUsers: many(documentsUsers),
}))
