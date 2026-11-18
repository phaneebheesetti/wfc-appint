import { relations } from "drizzle-orm"
import { boolean, index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type CasesTransaction, casesTransactions } from "./cases-transactions"
import { contactInfos } from "./contact-infos"
import { type OrganizationUser, organizationsUsers } from "./organizations-users"
import { type PaymentLog, paymentLogs } from "./payment-logs"
import { type User, users } from "./users"

export const organizationsVisibilityEnum = pgEnum(
  "organizations_visibility",
  Object.values(OrganizationsVisibilityEnum) as [string, ...string[]]
)

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactInfoId: uuid("contact_info_id").references(() => contactInfos.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    adminUserId: uuid("admin_user_id").references(() => users.id),
    fundraisingConsultantUserId: uuid("fundraising_consultant_user_id").references(() => users.id),
    encryptionKeySecretId: uuid("encryption_key_secret_id"),
    stripeConnectedAccountId: varchar("stripe_connected_account_id"),

    name: varchar("name"),
    accountNumber: varchar("account_number"),
    contactEmail: varchar("contact_email"),
    street: varchar("street"),
    city: varchar("city"),
    postalCode: varchar("postal_code"),
    state: varchar("state"),
    country: varchar("country").default("US"),
    visibility: organizationsVisibilityEnum("visibility").notNull().default(OrganizationsVisibilityEnum.PUBLISHED),
    deletedAt: timestamp("deleted_at"),
    // Salesforce Account.LastModifiedDate as of the last successful nightly sync; used to skip
    // re-processing an org whose SF record hasn't changed since it was last synced.
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),

    ...timestamps,
    sfAccountId: varchar("sf_account_id"),
    isBulkUpload: boolean("is_bulk_upload").notNull().default(false),
  },
  table => [
    ...getDefaultPolicies("organizations"),
    // foreign key indexes
    index("idx_organizations_created_by_user_id").on(table.createdByUserId),
    index("idx_organizations_admin_user_id").on(table.adminUserId),
    index("idx_organizations_fundraising_consultant_user_id").on(table.fundraisingConsultantUserId),
    // single column indexes
    index("idx_organizations_name").on(table.name),
    index("idx_organizations_street").on(table.street),
    index("idx_organizations_visibility").on(table.visibility),
    index("idx_organizations_created_at").on(table.createdAt),
    index("idx_organizations_deleted_at").on(table.deletedAt),
  ]
).enableRLS()

export type Organization = typeof organizations.$inferSelect & {
  createdByUser?: User
  adminUser?: User | null
  fundraisingConsultantUser?: User | null
  paymentLogs?: PaymentLog[]
  casesTransactions?: CasesTransaction[]
  organizationsUsers?: OrganizationUser[]
  campaigns?: Campaign[]
}

export type OrganizationSelect = typeof organizations.$inferSelect
export type OrganizationInsert = typeof organizations.$inferInsert

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [organizations.createdByUserId],
    references: [users.id],
    relationName: "createdByUser",
  }),
  adminUser: one(users, {
    fields: [organizations.adminUserId],
    references: [users.id],
    relationName: "adminUser",
  }),
  fundraisingConsultantUser: one(users, {
    fields: [organizations.fundraisingConsultantUserId],
    references: [users.id],
    relationName: "fundraisingConsultantUser",
  }),
  contactInfo: one(contactInfos, {
    fields: [organizations.contactInfoId],
    references: [contactInfos.id],
  }),
  paymentLogs: many(paymentLogs),
  casesTransactions: many(casesTransactions),
  organizationsUsers: many(organizationsUsers),
  campaigns: many(campaigns),
}))
