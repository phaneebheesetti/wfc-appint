import { and, isNull, sql } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations } from "@/server/db/schema"

export const organizationsCheckDuplicateByAccountNumber = async ({
  accountNumber,
  database,
}: {
  accountNumber: string
  database: typeof db
}) => {
  const trimmedAccountNumber = accountNumber.trim()
  if (!trimmedAccountNumber) return null

  const [existing] = await database
    .select({
      id: organizations.id,
      fundraisingConsultantUserId: organizations.fundraisingConsultantUserId,
    })
    .from(organizations)
    .where(
      and(sql`lower(${organizations.accountNumber}) = lower(${trimmedAccountNumber})`, isNull(organizations.deletedAt))
    )
    .limit(1)

  return existing ?? null
}
