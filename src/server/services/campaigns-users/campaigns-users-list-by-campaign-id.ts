import { eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"

export const campaignsUsersListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const campaignUsers = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.campaignId, input.campaignId),
    with: {
      user: {
        with: {
          parentUser: true,
        },
      },
    },
  })

  return campaignUsers
}
