import { and, eq, inArray, or } from "drizzle-orm"

import type { db } from "@/server/db"
import { type OrganizationUser, organizationsUsers, users } from "@/server/db/schema"

export const organizationsUsersGetParticipantsByEmailOrPhone = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; emails?: string[]; phones?: string[] }
}) => {
  const emails = input.emails ?? []
  const phones = input.phones ?? []
  const normalizedEmails = emails.map(e => e.trim().toLowerCase())
  const organizationUsersResult = await database
    .select()
    .from(organizationsUsers)
    .innerJoin(users, eq(organizationsUsers.userId, users.id))
    .where(
      and(
        eq(organizationsUsers.organizationId, input.organizationId),
        or(inArray(users.email, normalizedEmails), inArray(users.phone, phones))
      )
    )

  const organizationUsersData: OrganizationUser[] = organizationUsersResult.map(orgUser => ({
    ...orgUser.organizations_users,
    user: {
      ...orgUser.users,
    },
  }))

  return organizationUsersData
}
