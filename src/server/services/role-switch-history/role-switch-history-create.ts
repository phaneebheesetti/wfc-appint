import type { db } from "@/server/db"
import { type RoleSwitchHistoryInsert, roleSwitchHistory } from "@/server/db/schema"

export const roleSwitchHistoryCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: RoleSwitchHistoryInsert
}) => {
  const [created] = await database.insert(roleSwitchHistory).values(input).returning()

  return created ?? null
}
