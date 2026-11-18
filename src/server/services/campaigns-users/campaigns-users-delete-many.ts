import { inArray } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"

export const campaignsUsersDeleteMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: { ids: string[] }
}) => {
  if (input.ids.length === 0) return

  await database.delete(campaignsUsers).where(inArray(campaignsUsers.id, input.ids))
}
