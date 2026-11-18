import type { db } from "@/server/db"
import { type PrizeInsert, type PrizeSelect, prizes } from "@/server/db/schema"

export const prizesCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: PrizeInsert
}): Promise<PrizeSelect | undefined> => {
  const [prize] = await database.insert(prizes).values(input).returning()
  return prize
}
