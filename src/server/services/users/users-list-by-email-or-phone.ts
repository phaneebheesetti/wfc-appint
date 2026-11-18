import { and, inArray, or } from "drizzle-orm"

import { type RolesEnum } from "@/constants/roles"
import { type db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersListByEmailOrPhone = async ({
  database,
  input,
}: {
  database: typeof db
  input: { emails?: string[]; phones?: string[]; roles?: RolesEnum[] }
}) => {
  const { emails = [], phones = [], roles = [] } = input
  if (emails.length === 0 && phones.length === 0) return []

  const normalizedEmails = emails.map(e => e.trim().toLowerCase())
  const identityMatch = or(inArray(users.email, normalizedEmails), inArray(users.phone, phones))
  const where = roles.length > 0 ? and(identityMatch, inArray(users.role, roles)) : identityMatch

  return database.query.users.findMany({
    where,
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  })
}
