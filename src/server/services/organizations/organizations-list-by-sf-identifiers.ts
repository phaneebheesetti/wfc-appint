import { and, inArray, isNull, or, sql } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations } from "@/server/db/schema"

export const organizationsListBySFIdentifiers = async ({
  database,
  input,
}: {
  database: typeof db
  input: { accountNumbers?: string[]; sfAccountIds?: string[] }
}) => {
  const accountNumbers = Array.from(
    new Set((input.accountNumbers ?? []).map(value => value.trim().toLowerCase()))
  ).filter(Boolean)
  const sfAccountIds = Array.from(new Set((input.sfAccountIds ?? []).map(value => value.trim()))).filter(Boolean)

  if (accountNumbers.length === 0 && sfAccountIds.length === 0) return []

  const matchers = [
    accountNumbers.length ? inArray(sql`lower(${organizations.accountNumber})`, accountNumbers) : undefined,
    sfAccountIds.length ? inArray(organizations.sfAccountId, sfAccountIds) : undefined,
  ].filter(matcher => !!matcher)

  return database.query.organizations.findMany({
    where: and(isNull(organizations.deletedAt), or(...matchers)),
  })
}
