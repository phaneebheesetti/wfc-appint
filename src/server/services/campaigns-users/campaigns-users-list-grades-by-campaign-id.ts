import { asc, eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers, users } from "@/server/db/schema"

export const campaignsUsersListGradesByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const grades = await database
    .selectDistinct({ grade: users.grade })
    .from(users)
    .innerJoin(campaignsUsers, eq(users.id, campaignsUsers.userId))
    .where(eq(campaignsUsers.campaignId, input.campaignId))
    .orderBy(asc(users.grade))

  return grades.map(grade => grade.grade).filter((grade): grade is string => grade !== null)
}
