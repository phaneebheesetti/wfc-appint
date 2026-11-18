import { asc, eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers, users } from "@/server/db/schema"

export const campaignsUsersListTeacherNamesByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const teacherNames = await database
    .selectDistinct({ teacherName: users.teacherName })
    .from(users)
    .innerJoin(campaignsUsers, eq(users.id, campaignsUsers.userId))
    .where(eq(campaignsUsers.campaignId, input.campaignId))
    .orderBy(asc(users.teacherName))

  return teacherNames
    .map(teacherName => teacherName.teacherName)
    .filter((teacherName): teacherName is string => teacherName !== null)
}
