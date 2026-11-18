import { eq } from "drizzle-orm"

import {
  type NightlyJobNameEnum,
  type NightlyJobRecipients,
  type NightlyJobSchedule,
  NightlyJobStatusEnum,
} from "@/constants/nightly-jobs"
import type { db } from "@/server/db"
import { nightlyJobs } from "@/server/db/schema"

// A job with no schedule configured is always due (runs on every invocation).
export function isNightlyJobDue(schedule: NightlyJobSchedule | null | undefined, now: Date): boolean {
  if (!schedule) return true

  if (schedule.frequency === "weekly") return now.getUTCDay() === schedule.dayOfWeek

  return now.getUTCDate() === schedule.dayOfMonth
}

export function resolveEmailRecipients(
  recipients: NightlyJobRecipients | null | undefined
): { to: string[]; cc: string[] } | null {
  const to = recipients?.to?.filter(Boolean) ?? []
  const cc = recipients?.cc?.filter(Boolean) ?? []

  if (to.length === 0 && cc.length === 0) return null

  return to.length > 0 ? { to, cc } : { to: cc, cc: [] }
}

export const nightlyJobsGetOrCreate = async ({
  database,
  jobName,
}: {
  database: typeof db
  jobName: NightlyJobNameEnum
}) => {
  const existing = await database.query.nightlyJobs.findFirst({
    where: eq(nightlyJobs.jobName, jobName),
  })
  if (existing) return existing

  const [created] = await database.insert(nightlyJobs).values({ jobName }).returning()

  return created!
}

export const nightlyJobsUpdate = async ({
  database,
  jobName,
  completedAt,
  status,
}: {
  database: typeof db
  jobName: NightlyJobNameEnum
  completedAt: Date
  status: NightlyJobStatusEnum
}) => {
  await database
    .update(nightlyJobs)
    .set({
      lastRun: completedAt,
      lastRunStatus: status,
      ...(status === NightlyJobStatusEnum.SUCCESS ? { lastSuccessfulRun: completedAt } : {}),
    })
    .where(eq(nightlyJobs.jobName, jobName))
}
