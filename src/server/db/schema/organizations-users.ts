import { relations } from "drizzle-orm"
import { boolean, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const organizationsUsers = pgTable(
  "organizations_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    eligible: boolean("eligible").notNull().default(false),
    eligibleUpdatedAt: timestamp("eligible_updated_at"),
    eligibleUpdatedByUserId: uuid("eligible_updated_by_user_id").references(() => users.id),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("organizations_users"),
    // foreign key indexes
    uniqueIndex().on(table.organizationId, table.userId),
    index("idx_organizations_users_organization_id").on(table.organizationId),
    index("idx_organizations_users_user_id").on(table.userId),
    index("idx_organizations_users_created_at").on(table.createdAt),
    // composite indexes for organizations
    index("idx_organizations_users_organization_eligible").on(table.organizationId, table.eligible),
    // composite indexes for organizations, users
    index("idx_organizations_users_organization_user_created_at").on(
      table.organizationId,
      table.userId,
      table.createdAt
    ),
    index("idx_organizations_users_organization_user_eligible").on(table.organizationId, table.userId, table.eligible),
  ]
).enableRLS()

export type OrganizationUser = typeof organizationsUsers.$inferSelect & {
  organization?: Organization
  user?: User
  eligibleUpdatedByUser?: User | null
}

export type OrganizationUserSelect = typeof organizationsUsers.$inferSelect
export type OrganizationUserInsert = typeof organizationsUsers.$inferInsert

export const organizationsUsersRelations = relations(organizationsUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationsUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationsUsers.userId],
    references: [users.id],
    relationName: "user",
  }),
  eligibleUpdatedByUser: one(users, {
    fields: [organizationsUsers.eligibleUpdatedByUserId],
    references: [users.id],
    relationName: "eligibleUpdatedByUser",
  }),
}))
