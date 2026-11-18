import { relations, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  pgView,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { type UserOnboardingProgress } from "@/constants/onboarding"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type CampaignUser, campaignsUsers } from "./campaigns-users"
import { type CasesTransaction, casesTransactions } from "./cases-transactions"
import { contactInfos } from "./contact-infos"
import { type DocumentUser, documentsUsers } from "./documents-users"
import { type OrganizationUser, organizationsUsers } from "./organizations-users"
import { type PaymentLog, paymentLogs } from "./payment-logs"
import { rolesEnum } from "./role-permissions"

export const usersStatusEnum = pgEnum("user_status", Object.values(UsersStatusEnum) as [string, ...string[]])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id"),
    clerkExternalId: varchar("clerk_external_id"),
    contactInfoId: uuid("contact_info_id").references(() => contactInfos.id),
    parentUserId: uuid("parent_user_id").references((): AnyPgColumn => users.id),
    invitedByUserId: uuid("invited_by_user_id").references((): AnyPgColumn => users.id),
    encryptionKeySecretId: uuid("encryption_key_secret_id"),

    status: usersStatusEnum("status").notNull().default(UsersStatusEnum.PENDING),
    role: rolesEnum("role").notNull().default(RolesEnum.USER),
    pin: varchar("pin", { length: 5 }),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    fullName: varchar("full_name"),
    email: varchar("email"),
    phone: varchar("phone"),
    grade: varchar("grade"),
    teacherName: varchar("teacher_name"),
    encrypted: boolean("encrypted").default(false),
    acceptedTermsAndConditions: boolean("accepted_terms_and_conditions").default(false),
    termsAcceptedAt: timestamp("terms_accepted_at"),
    termsAcceptedVersion: varchar("terms_accepted_version"),
    //email verification fields
    confirmEmailUrl: varchar("confirm_email_url"),
    reportEmailUrl: varchar("report_email_url"),
    emailVerificationSentAt: timestamp("email_verification_sent_at"),
    // AnyPgColumn Type is used for self referencing columns to work with drizzle
    clerkInvitationUrl: varchar("clerk_invitation_url"),
    clerkInvitationSentAt: timestamp("clerk_invitation_sent_at"),
    // Last time the "Send Invite Email" group action sent this user an
    // access link, regardless of whether it went out as a Clerk invitation
    // or a magic-signin link.
    lastInviteSentAt: timestamp("last_invite_sent_at"),
    isBulkUpload: boolean("is_bulk_upload").notNull().default(false),
    // FC onboarding step progress, keyed by campaignId. See @/constants/onboarding.
    onboardingProgress: jsonb("onboarding_progress").$type<UserOnboardingProgress>(),
    deletedAt: timestamp("deleted_at"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("users"),
    // foreign key indexes
    index("idx_users_parent_user_id").on(table.parentUserId),
    index("idx_users_invited_by_user_id").on(table.invitedByUserId),
    // single column indexes
    index("idx_users_pin").on(table.pin),
    index("idx_users_full_name").on(table.fullName),
    index("idx_users_grade").on(table.grade),
    index("idx_users_teacher_name").on(table.teacherName),
    index("idx_users_created_at").on(table.createdAt),
    index("idx_users_deleted_at").on(table.deletedAt),
    // multi-role identity lookups (clerk_id / clerk_external_id repeat across role-rows)
    index("idx_users_clerk_id").on(table.clerkId),
    index("idx_users_clerk_external_id").on(table.clerkExternalId),
    index("idx_users_email").on(table.email),
    // partial unique: one live row per (email, role) and per (phone, role)
    uniqueIndex("users_email_role_unique")
      .on(table.email, table.role)
      .where(sql`${table.deletedAt} IS NULL AND ${table.email} IS NOT NULL`),
    uniqueIndex("users_phone_role_unique")
      .on(table.phone, table.role)
      .where(sql`${table.deletedAt} IS NULL AND ${table.phone} IS NOT NULL`),
  ]
).enableRLS()

export type User = typeof users.$inferSelect & {
  campaignsUsers?: CampaignUser[]
  organizationsUsers?: OrganizationUser[]
  casesTransactions?: CasesTransaction[]
  paymentLogs?: PaymentLog[]
  documentsUsers?: DocumentUser[]
  parentUser?: User | null
  invitedByUser?: User | null
}

export type UserSelect = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

export const usersRelations = relations(users, ({ one, many }) => ({
  contactInfo: one(contactInfos, {
    fields: [users.contactInfoId],
    references: [contactInfos.id],
  }),
  campaignsUsers: many(campaignsUsers),
  organizationsUsers: many(organizationsUsers, { relationName: "user" }),
  casesTransactions: many(casesTransactions, { relationName: "user" }),
  paymentLogs: many(paymentLogs, { relationName: "user" }),
  documentsUsers: many(documentsUsers, { relationName: "user" }),
  parentUser: one(users, {
    fields: [users.parentUserId],
    references: [users.id],
    relationName: "parentUser",
  }),
  invitedByUser: one(users, {
    fields: [users.invitedByUserId],
    references: [users.id],
    relationName: "invitedByUser",
  }),
}))

export const usersEncrypted = pgView("users_encrypted", {
  id: uuid("id"),
  clerkId: varchar("clerk_id"),
  clerkExternalId: varchar("clerk_external_id"),
  contactInfoId: uuid("contact_info_id"),
  status: usersStatusEnum("status"),
  role: rolesEnum("role"),
  pin: varchar("pin"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  fullName: varchar("full_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  grade: varchar("grade"),
  teacherName: varchar("teacher_name"),
  encrypted: boolean("encrypted"),
  parentUserId: uuid("parent_user_id"),
  invitedByUserId: uuid("invited_by_user_id"),
  encryptionKeySecretId: uuid("encryption_key_secret_id"),
  clerkInvitationUrl: varchar("clerk_invitation_url"),
  clerkInvitationSentAt: timestamp("clerk_invitation_sent_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
}).existing()
