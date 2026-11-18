import { jsonb, pgEnum, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"

import { type NightlyJobRecipients, type NightlyJobSchedule, NightlyJobStatusEnum } from "@/constants/nightly-jobs"
import { getDefaultPolicies } from "@/server/db/helpers"

export const nightlyJobsStatusEnum = pgEnum(
  "nightly_jobs_status",
  Object.values(NightlyJobStatusEnum) as [string, ...string[]]
)

export const nightlyJobs = pgTable(
  "nightly_jobs",
  {
    id: serial("id").primaryKey(),
    jobName: varchar("job_name").notNull(),
    lastRun: timestamp("last_run", { withTimezone: true }),
    lastRunStatus: nightlyJobsStatusEnum("last_run_status"),
    lastSuccessfulRun: timestamp("last_successful_run", { withTimezone: true }),
    recipients: jsonb("recipients").$type<NightlyJobRecipients>(),
    schedule: jsonb("schedule").$type<NightlyJobSchedule>(),
  },
  table => [...getDefaultPolicies("nightly_jobs"), uniqueIndex("nightly_jobs_job_name_unique").on(table.jobName)]
).enableRLS()

export type NightlyJob = typeof nightlyJobs.$inferSelect
export type NightlyJobSelect = typeof nightlyJobs.$inferSelect
export type NightlyJobInsert = typeof nightlyJobs.$inferInsert
