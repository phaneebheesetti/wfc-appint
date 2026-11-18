import { boolean, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

export const contactInfos = pgTable(
  "contact_infos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    fullName: varchar("full_name"),
    email: varchar("email").unique(),
    phone: varchar("phone").unique(),
    street: varchar("street"),
    city: varchar("city"),
    postalCode: varchar("postal_code"),
    state: varchar("state"),
    country: varchar("country").default("US"),
    grade: varchar("grade"),
    teacherName: varchar("teacher_name"),
    encrypted: boolean("encrypted").default(false),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("contact_infos"),
    index("idx_contact_infos_email").on(table.email),
    index("idx_contact_infos_phone").on(table.phone),
  ]
).enableRLS()

export type ContactInfo = typeof contactInfos.$inferSelect
export type ContactInfoSelect = typeof contactInfos.$inferSelect
export type ContactInfoInsert = typeof contactInfos.$inferInsert
