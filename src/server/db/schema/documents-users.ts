import { relations } from "drizzle-orm"
import { index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Document, documents } from "./documents"
import { type User, users } from "./users"

export const documentUserStatusEnum = pgEnum(
  "document_user_status",
  Object.values(DocumentsUsersStatusEnum) as [string, ...string[]]
)

export const documentsUsers = pgTable(
  "documents_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    status: documentUserStatusEnum("status").notNull().default(DocumentsUsersStatusEnum.PENDING),
    signedAt: timestamp("signed_at"),
    sentEmailAt: timestamp("sent_email_at"),
    metadata: jsonb("metadata"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("documents_users"),
    // foreign key indexes
    index("idx_documents_users_document_id").on(table.documentId),
    index("idx_documents_users_user_id").on(table.userId),
    // composite indexes for documents
    index("idx_documents_users_document_status").on(table.documentId, table.status),
    index("idx_documents_users_document_signed_at").on(table.documentId, table.signedAt),
    index("idx_documents_users_document_sent_email_at").on(table.documentId, table.sentEmailAt),
    index("idx_documents_users_document_created_at").on(table.documentId, table.createdAt),
    // composite indexes for users
    index("idx_documents_users_user_status").on(table.userId, table.status),
  ]
).enableRLS()

export type DocumentUser = typeof documentsUsers.$inferSelect & {
  document?: Document
  user?: User
}

export type DocumentUserSelect = typeof documentsUsers.$inferSelect
export type DocumentUserInsert = typeof documentsUsers.$inferInsert

export const documentsUsersRelations = relations(documentsUsers, ({ one }) => ({
  document: one(documents, {
    fields: [documentsUsers.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentsUsers.userId],
    references: [users.id],
  }),
}))
