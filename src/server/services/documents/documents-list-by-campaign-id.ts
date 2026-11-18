import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documents } from "@/server/db/schema"

export const documentsListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const documentsData = await database.query.documents.findMany({
    where: eq(documents.campaignId, input.campaignId),
    with: {
      uploadedByUser: true,
      documentsUsers: {
        with: {
          user: true,
        },
      },
    },
  })
  return documentsData
}
