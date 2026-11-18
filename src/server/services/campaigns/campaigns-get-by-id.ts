import { and, eq, isNull } from "drizzle-orm"

import type { db } from "@/server/db"
import { campaigns } from "@/server/db/schema"

export const campaignsGetById = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const campaign = await database.query.campaigns.findFirst({
    where: and(eq(campaigns.id, input.id), isNull(campaigns.deletedAt)),
    with: {
      sponsor: true,
      organization: {
        with: {
          createdByUser: true,
        },
      },
      casesTransactions: true,
      createdByUser: true,
    },
  })

  return campaign ?? null
}
