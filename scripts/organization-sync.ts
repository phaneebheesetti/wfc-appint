import "dotenv/config"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { renderOrganizationSyncEmailHtml } from "@/components/emails/organization-sync-email"
import { NightlyJobNameEnum, NightlyJobStatusEnum, ORGANIZATION_SYNC_EMAIL_SUBJECT } from "@/constants/nightly-jobs"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { getSalesforceConnection } from "@/lib/salesforce"
import { createServiceClient } from "@/lib/supabase/service-client"
import { db } from "@/server/db"
import { type OrganizationSelect, type UserSelect, organizations, users } from "@/server/db/schema"
import { sendEmail } from "@/server/services/email-messaging"
import { nightlyJobsGetOrCreate, nightlyJobsUpdate, resolveEmailRecipients } from "@/server/services/nightly-jobs"

// No prior successful run to filter Salesforce's `LastModifiedDate` against yet, so the first-ever
// run behaves as if the last successful run happened at this fixed point in time. Kept out of the
// database on purpose — it's a script-only fallback, not a real run.
const FIRST_RUN_SINCE_FALLBACK = new Date("2026-07-01T00:00:00.000Z")

// Change here if a dedicated bucket/folder naming is preferred.
const LOG_BUCKET = "nightly-job-logs"
const LOG_ROOT_FOLDER = "NIGHTLY_JOBS_LOGS"
const LOG_JOB_FOLDER = "ORGANIZATION_SYNC"
const LOG_RETENTION_DAYS = 30
const LOG_FILENAME_PATTERN = /^logs-(\d{4})-(\d{2})-(\d{2})-(\d{2})\.(\d{2})\.(\d{2})\.json$/

const ACCOUNT_FIELDS = "Id, Name, SAP_Account_ID__c, Email__c, BillingAddress, LastModifiedDate, ISR_Account_Email__c"

interface RawSFAccountRecord {
  Name?: string | null
  SAP_Account_ID__c?: string | null
  Email__c?: string | null
  BillingAddress?: {
    street?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  } | null
  LastModifiedDate: string
  ISR_Account_Email__c?: string | null
}

interface SalesforceAccountSyncRecord {
  accountNumber: string | null
  name: string | null
  contactEmail: string | null
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  lastModifiedDate: string
  assignedIsrPrimaryEmail: string | null
}

interface OrganizationFieldModification {
  modifiedFieldName: string
  from: string | null
  to: string | null
}

interface ModifiedOrgFromSF {
  accountNumber: string
  name: string
  lastModifiedDate: string
}

interface SuccessfulModification {
  organizationId: string
  accountNumber: string
  modifications: OrganizationFieldModification[]
}

interface FailedModification {
  organizationId: string
  accountNumber: string
  error: string
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const pad = (value: number) => String(value).padStart(2, "0")

const filenameStamp = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}-` +
  `${pad(date.getUTCHours())}.${pad(date.getUTCMinutes())}.${pad(date.getUTCSeconds())}`

const formatForEmail = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`

// Every SF account modified since the given timestamp, irrespective of whether it corresponds to
// an org already imported into the app — matching against the app's organizations happens
// afterwards, in main().
async function fetchSFAccountsModifiedSince(since: Date): Promise<SalesforceAccountSyncRecord[]> {
  const conn = await getSalesforceConnection()

  const result = await conn.query(
    `SELECT ${ACCOUNT_FIELDS} FROM Account WHERE LastModifiedDate > ${since.toISOString()}`,
    { autoFetch: true, maxFetch: 100000 }
  )

  return ((result.records ?? []) as RawSFAccountRecord[]).map(record => ({
    accountNumber: record.SAP_Account_ID__c ?? null,
    name: record.Name ?? null,
    contactEmail: record.Email__c ?? null,
    street: record.BillingAddress?.street ?? null,
    city: record.BillingAddress?.city ?? null,
    state: record.BillingAddress?.state ?? null,
    postalCode: record.BillingAddress?.postalCode ?? null,
    lastModifiedDate: record.LastModifiedDate,
    assignedIsrPrimaryEmail: record.ISR_Account_Email__c ?? null,
  }))
}

// Matches Salesforce's ISR_Account_Email__c to a WFC user, restricted to non-deleted
// Sales Representatives (a `users_email_role_unique` partial unique index guarantees at most one
// live row per (email, role), so there's never more than one match per email here).
async function resolveIsrUsersByEmail(emails: string[]): Promise<Map<string, UserSelect>> {
  const resultByEmail = new Map<string, UserSelect>()

  const normalizedEmails = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)))
  if (normalizedEmails.length === 0) return resultByEmail

  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        inArray(sql`lower(${users.email})`, normalizedEmails),
        eq(users.role, RolesEnum.SALES_REPRESENTATIVE),
        isNull(users.deletedAt)
      )
    )

  for (const row of rows) {
    const key = row.email ? normalizeEmail(row.email) : ""
    if (key) resultByEmail.set(key, row)
  }

  return resultByEmail
}

// Diffs the 6 tracked fields between an app organization and its matching Salesforce account.
// Only fields that actually differ are returned — callers must skip persisting/logging anything
// when `modifications` is empty.
function diffOrganizationWithSFAccount({
  organization,
  account,
  currentFcUser,
  matchedIsrUser,
}: {
  organization: OrganizationSelect
  account: SalesforceAccountSyncRecord
  currentFcUser: UserSelect | null
  matchedIsrUser: UserSelect | null
}): {
  modifications: OrganizationFieldModification[]
  fields: Partial<
    Pick<
      OrganizationSelect,
      "name" | "contactEmail" | "street" | "city" | "state" | "postalCode" | "fundraisingConsultantUserId"
    >
  >
} {
  const modifications: OrganizationFieldModification[] = []
  const fields: ReturnType<typeof diffOrganizationWithSFAccount>["fields"] = {}

  const compare = (
    modifiedFieldName: string,
    from: string | null,
    to: string | null,
    applyTo: (value: string | null) => void
  ) => {
    const normalizedFrom = from ?? null
    const normalizedTo = to ?? null
    if (normalizedFrom === normalizedTo) return

    modifications.push({ modifiedFieldName, from: normalizedFrom, to: normalizedTo })
    applyTo(normalizedTo)
  }

  compare("name", organization.name, account.name, value => (fields.name = value))
  compare("contactEmail", organization.contactEmail, account.contactEmail, value => (fields.contactEmail = value))
  compare("street", organization.street, account.street, value => (fields.street = value))
  compare("city", organization.city, account.city, value => (fields.city = value))
  compare("state", organization.state, account.state, value => (fields.state = value))
  compare("postalCode", organization.postalCode, account.postalCode, value => (fields.postalCode = value))

  const isrEmail = account.assignedIsrPrimaryEmail ? normalizeEmail(account.assignedIsrPrimaryEmail) : null
  const currentFcEmail = currentFcUser?.email ? normalizeEmail(currentFcUser.email) : null

  if (isrEmail !== currentFcEmail) {
    const newFcUserId = matchedIsrUser?.id ?? null

    if (newFcUserId !== organization.fundraisingConsultantUserId) {
      modifications.push({
        modifiedFieldName: "fundraisingConsultantEmail",
        from: currentFcUser?.email ?? null,
        to: matchedIsrUser?.email ?? null,
      })
      fields.fundraisingConsultantUserId = newFcUserId
    }
  }

  return { modifications, fields }
}

async function writeLogFile({ payload, completedAt }: { payload: Record<string, unknown>; completedAt: Date }) {
  const supabase = createServiceClient()
  const fileName = `logs-${filenameStamp(completedAt)}.json`
  const objectPath = `${LOG_ROOT_FOLDER}/${LOG_JOB_FOLDER}/${fileName}`

  const { error } = await supabase.storage
    .from(LOG_BUCKET)
    .upload(objectPath, Buffer.from(JSON.stringify(payload, null, 2)), {
      contentType: "application/json",
      upsert: true,
    })

  if (error) console.error(`Failed to upload log file ${objectPath}:`, error.message)

  return objectPath
}

async function cleanupOldLogFiles(referenceDate: Date) {
  const supabase = createServiceClient()
  const folderPath = `${LOG_ROOT_FOLDER}/${LOG_JOB_FOLDER}`

  const { data: files, error } = await supabase.storage.from(LOG_BUCKET).list(folderPath)
  if (error) {
    console.error("Failed to list log files for cleanup:", error.message)
    return
  }

  const cutoff = new Date(referenceDate.getTime() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const staleObjectPaths: string[] = []

  for (const file of files ?? []) {
    const match = LOG_FILENAME_PATTERN.exec(file.name)
    if (!match) continue

    const [, year, month, day, hour, minute, second] = match
    const fileDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    )
    if (fileDate < cutoff) staleObjectPaths.push(`${folderPath}/${file.name}`)
  }

  if (staleObjectPaths.length === 0) return

  const { error: removeError } = await supabase.storage.from(LOG_BUCKET).remove(staleObjectPaths)
  if (removeError) console.error("Failed to delete stale log files:", removeError.message)
}

async function main() {
  let jobRow: Awaited<ReturnType<typeof nightlyJobsGetOrCreate>> | null = null
  let topLevelError: string | null = null

  try {
    jobRow = await nightlyJobsGetOrCreate({ database: db, jobName: NightlyJobNameEnum.ORGANIZATION_SYNC })
  } catch (error) {
    topLevelError = errorMessage(error)
  }

  const since = jobRow?.lastSuccessfulRun ?? FIRST_RUN_SINCE_FALLBACK

  let sfAccounts: SalesforceAccountSyncRecord[] = []
  if (!topLevelError) {
    try {
      sfAccounts = await fetchSFAccountsModifiedSince(since)
    } catch (error) {
      topLevelError = errorMessage(error)
    }
  }

  let matchedOrgs: OrganizationSelect[] = []
  if (!topLevelError) {
    try {
      const accountNumbersFromSF = Array.from(
        new Set(sfAccounts.map(account => account.accountNumber).filter((value): value is string => Boolean(value)))
      )

      if (accountNumbersFromSF.length > 0) {
        matchedOrgs = await db
          .select()
          .from(organizations)
          .where(inArray(organizations.accountNumber, accountNumbersFromSF))
      }
    } catch (error) {
      topLevelError = errorMessage(error)
    }
  }

  const modifiedOrgsFromSF: ModifiedOrgFromSF[] = []
  const successfulModifications: SuccessfulModification[] = []
  const failedModifications: FailedModification[] = []

  if (!topLevelError) {
    const matchedAccountNumbers = new Set(
      matchedOrgs.map(org => org.accountNumber).filter((value): value is string => Boolean(value))
    )

    for (const account of sfAccounts) {
      if (account.accountNumber && matchedAccountNumbers.has(account.accountNumber)) {
        modifiedOrgsFromSF.push({
          accountNumber: account.accountNumber,
          name: account.name ?? "",
          lastModifiedDate: account.lastModifiedDate,
        })
      }
    }

    const sfAccountByAccountNumber = new Map(
      sfAccounts.filter(account => account.accountNumber).map(account => [account.accountNumber!, account])
    )

    const isrEmails = sfAccounts
      .map(account => account.assignedIsrPrimaryEmail)
      .filter((value): value is string => Boolean(value))
    const isrUsersByEmail = await resolveIsrUsersByEmail(isrEmails)

    const currentFcUserIds = Array.from(
      new Set(
        matchedOrgs.map(org => org.fundraisingConsultantUserId).filter((value): value is string => Boolean(value))
      )
    )
    const currentFcUsers =
      currentFcUserIds.length > 0 ? await db.select().from(users).where(inArray(users.id, currentFcUserIds)) : []
    const currentFcUserById = new Map(currentFcUsers.map(user => [user.id, user]))

    for (const org of matchedOrgs) {
      const account = org.accountNumber ? sfAccountByAccountNumber.get(org.accountNumber) : undefined
      if (!account) continue

      const accountLastModified = new Date(account.lastModifiedDate)
      if (org.lastSyncedAt && org.lastSyncedAt.getTime() === accountLastModified.getTime()) continue

      const currentFcUser = org.fundraisingConsultantUserId
        ? (currentFcUserById.get(org.fundraisingConsultantUserId) ?? null)
        : null
      const isrEmailKey = account.assignedIsrPrimaryEmail?.trim().toLowerCase() ?? null
      const matchedIsrUser = isrEmailKey ? (isrUsersByEmail.get(isrEmailKey) ?? null) : null

      const { modifications, fields } = diffOrganizationWithSFAccount({
        organization: org,
        account,
        currentFcUser,
        matchedIsrUser,
      })

      if (modifications.length === 0) continue

      try {
        await db
          .update(organizations)
          .set({ ...fields, lastSyncedAt: accountLastModified })
          .where(eq(organizations.id, org.id))

        successfulModifications.push({
          organizationId: org.id,
          accountNumber: org.accountNumber!,
          modifications,
        })
      } catch (error) {
        failedModifications.push({
          organizationId: org.id,
          accountNumber: org.accountNumber!,
          error: errorMessage(error),
        })
      }
    }
  }

  let status: NightlyJobStatusEnum
  if (topLevelError) {
    status = NightlyJobStatusEnum.FAILURE
  } else if (failedModifications.length === 0) {
    status = NightlyJobStatusEnum.SUCCESS
  } else if (successfulModifications.length > 0) {
    status = NightlyJobStatusEnum.PARTIAL_SUCCESS
  } else {
    status = NightlyJobStatusEnum.FAILURE
    topLevelError = "Individual organizations update failed"
  }

  const completedAt = new Date()

  const logPayload: Record<string, unknown> = {
    date: completedAt.toISOString(),
    status,
    "modified-orgs-from-sf": modifiedOrgsFromSF.map(org => ({
      "account-number": org.accountNumber,
      name: org.name,
      "last-modified-date": org.lastModifiedDate,
    })),
  }
  if (topLevelError) logPayload.error = topLevelError
  if (successfulModifications.length > 0) {
    logPayload["successfully-modified"] = Object.fromEntries(
      successfulModifications.map(modification => [
        modification.organizationId,
        {
          "account-number": modification.accountNumber,
          modifications: modification.modifications.map(field => ({
            "modified-field-name": field.modifiedFieldName,
            from: field.from,
            to: field.to,
          })),
        },
      ])
    )
  }
  if (failedModifications.length > 0) {
    logPayload["failed-modifications"] = Object.fromEntries(
      failedModifications.map(failure => [
        failure.organizationId,
        { "account-number": failure.accountNumber, error: failure.error },
      ])
    )
  }

  const logObjectPath = await writeLogFile({ payload: logPayload, completedAt })
  await cleanupOldLogFiles(completedAt)

  try {
    await nightlyJobsUpdate({ database: db, jobName: NightlyJobNameEnum.ORGANIZATION_SYNC, completedAt, status })
  } catch (error) {
    console.error("Failed to update NIGHTLY_JOBS row:", errorMessage(error))
  }

  console.log(`Status: ${status}`)
  console.log(`Log: ${LOG_BUCKET}/${logObjectPath}`)
  if (topLevelError) console.error(`Error: ${topLevelError}`)
  console.log(
    `Modified in SF: ${modifiedOrgsFromSF.length}  Successful: ${successfulModifications.length}  Failed: ${failedModifications.length}`
  )

  const emailRecipients = resolveEmailRecipients(jobRow?.recipients)

  if (env.NIGHTLY_JOBS_EMAIL_NOTIFICATIONS_ENABLED === "true" && emailRecipients) {
    const html = await renderOrganizationSyncEmailHtml({
      status,
      completedAt: formatForEmail(completedAt),
      environment: env.APP_ENV ?? "",
      successfulChanges: successfulModifications,
      failedModifications,
    })

    await sendEmail({
      to: emailRecipients.to,
      cc: emailRecipients.cc,
      subject: `${env.APP_ENV ? `${env.APP_ENV.toUpperCase()} -- ` : ""}${ORGANIZATION_SYNC_EMAIL_SUBJECT}`,
      html,
      sendMultiple: false,
    })
  }

  return status === NightlyJobStatusEnum.FAILURE ? 1 : 0
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("\nError:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
