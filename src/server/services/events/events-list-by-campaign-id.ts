import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { events } from "@/server/db/schema"

export const eventsListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  return database.query.events.findMany({
    where: eq(events.campaignId, input.campaignId),
    with: {
      prize: true,
    },
    orderBy: (events, { desc }) => [desc(events.createdAt)],
  })
}
