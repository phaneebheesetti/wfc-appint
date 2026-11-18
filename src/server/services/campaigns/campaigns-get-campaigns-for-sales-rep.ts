import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations, prizes } from "@/server/db/schema"

export const campaignsGetCampaignsForSalesRep = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const organizationsData = await database.query.organizations.findMany({
    where: eq(organizations.fundraisingConsultantUserId, input.userId),

    with: {
      campaigns: {
        where: (campaigns, { isNull }) => isNull(campaigns.deletedAt),

        with: {
          sponsor: true,
          casesTransactions: true,
        },

        orderBy: (campaigns, { asc }) => [asc(campaigns.createdAt)],
      },
    },

    orderBy: (organizations, { asc }) => [asc(organizations.createdAt)],
  })

  return Promise.all(
    organizationsData.map(async organization => ({
      ...organization,
      campaigns: await Promise.all(
        organization.campaigns.map(async campaign => {
          const prize = await database.query.prizes.findFirst({
            where: eq(prizes.campaignId, campaign.id),
            columns: {
              id: true,
            },
          })

          return {
            ...campaign,
            hasPrizeSetup: !!prize,
          }
        })
      ),
    }))
  )
}
