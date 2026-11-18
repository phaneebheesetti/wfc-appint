import "dotenv/config"
import path from "node:path"
import * as XLSX from "xlsx"
import { z } from "zod"

import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { createServiceClient } from "@/lib/supabase/service-client"
import { db } from "@/server/db"
import { type OrganizationInsert, type OrganizationSelect, type UserSelect } from "@/server/db/schema"
import { organizationsCreateMany } from "@/server/services/organizations/organizations-create-many"
import { organizationsListBySFIdentifiers } from "@/server/services/organizations/organizations-list-by-sf-identifiers"
import { organizationsResolveFCsByEmail } from "@/server/services/organizations/organizations-resolve-fcs-by-email"
import {
  type SalesforceAccountRecord,
  normalizeAccountNumber,
  organizationsSearchSFAccountsByAccountNumbers,
} from "@/server/services/organizations/organizations-search-sf-by-account-numbers"
import { usersGetAllByEmail } from "@/server/services/users/users-get-all-by-email"

const DEFAULT_BATCH_SIZE = 25

const DEFAULT_BUCKET = "bulk-uploads"

const UPLOAD_FOLDER = "Create Organizations"
const REPORT_FOLDER = "Report"

const SPREADSHEET_PATTERN = /\.(csv|xlsx?)$/i

const NON_INPUT_PATTERNS = [/-report-/i, /-failed-/i, /^~\$/]

const BULK_CREATOR_ROLES: RolesEnum[] = [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN]

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const CSV_MIME_TYPE = "text/csv"

type FileFormat = "csv" | "xlsx"

const ACCOUNT_NUMBER_HEADERS = [
  "account_number",
  "accountnumber",
  "account_no",
  "salesforce_id",
  "salesforce_account_number",
  "sf_account_number",
  "sf_id",
  "sap_account_id",
  "sap_id",
]
const FC_EMAIL_HEADERS = [
  "fc_email",
  "email",
  "fc",
  "email_id",
  "email_for_fc",
  "email_of_fc",
  "email_id_of_fc",
  "fc_email_id",
  "fc_mail",
  "fc_email_address",
  "consultant_email",
  "fundraising_consultant",
  "fundraising_consultant_email",
  "email_for_fundraising_consultant",
]

type ParsedRow = { rowNumber: number; accountNumber: string; fcEmail: string }
type InvalidRow = ParsedRow & { message: string }
type ResultRow = ParsedRow & { status: string; message: string; organizationName: string; organizationId: string }
type CreatableRow = ParsedRow & { account: SalesforceAccountRecord; fcUserId: string | null }
type DuplicateRow = ParsedRow & { duplicateOfRow: number; organizationName: string }

const emailSchema = z.email("Invalid email")

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>()
  const positionals: string[] = []

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      positionals.push(arg)
      continue
    }
    const [name, value] = arg.slice(2).split("=")
    flags.set(name!, value ?? "true")
  }

  return {
    fileName: positionals[0],
    bucket: flags.get("bucket") ?? DEFAULT_BUCKET,
    sheetName: flags.get("sheet"),
    createdBy: flags.get("created-by"),
    batchSize: Number(flags.get("batch-size") ?? DEFAULT_BATCH_SIZE),
    dryRun: flags.has("dry-run"),
    list: flags.has("list"),
    latest: flags.has("latest"),
  }
}

type Source = { bucket: string; objectPath: string }

const describeSource = (source: Source) => `${source.bucket}/${source.objectPath}`

function fileFormatOf(target: string): FileFormat {
  if (/\.csv$/i.test(target)) return "csv"
  if (/\.xlsx?$/i.test(target)) return "xlsx"

  throw new Error(`Expected a .csv, .xlsx or .xls file, got "${target}"`)
}

const contentTypeFor = (format: FileFormat) => (format === "csv" ? CSV_MIME_TYPE : XLSX_MIME_TYPE)

type FolderEntry = { name: string; updatedAt: string; size: number }

async function listFolderFiles({ bucket, folder }: { bucket: string; folder: string }): Promise<FolderEntry[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 })

  if (error) throw new Error(`Could not list ${bucket}/${folder}: ${error.message}`)

  return (data ?? [])
    .filter(entry => !!entry.id)
    .filter(entry => SPREADSHEET_PATTERN.test(entry.name))
    .filter(entry => !NON_INPUT_PATTERNS.some(pattern => pattern.test(entry.name)))
    .map(entry => ({
      name: entry.name,
      updatedAt: entry.updated_at ?? entry.created_at ?? "",
      size: Number((entry.metadata as { size?: number } | null)?.size ?? 0),
    }))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}

const describeEntry = (entry: FolderEntry) =>
  `${entry.name}  (${Math.max(1, Math.round(entry.size / 1024))} kB, updated ${entry.updatedAt || "unknown"})`

async function resolveObjectPath({
  bucket,
  fileName,
  latest,
}: {
  bucket: string
  fileName?: string
  latest: boolean
}): Promise<string> {
  if (fileName) {
    const name = path.posix.basename(fileName.trim().replace(/\\/g, "/"))

    if (!SPREADSHEET_PATTERN.test(name)) {
      throw new Error(
        `"${fileName}" is not a .csv or .xlsx file name. The optional argument names a file inside ` +
          `${UPLOAD_FOLDER}; omit it to use whatever single file is in there.`
      )
    }

    return path.posix.join(UPLOAD_FOLDER, name)
  }

  const entries = await listFolderFiles({ bucket, folder: UPLOAD_FOLDER })

  if (entries.length === 0) {
    throw new Error(
      `No .csv or .xlsx file in ${bucket}/${UPLOAD_FOLDER}. Upload one there (Supabase dashboard). ` +
        `Run with --list to see what is in it.`
    )
  }

  const [newest] = entries
  if (entries.length > 1 && !latest) {
    throw new Error(
      `${entries.length} files in ${bucket}/${UPLOAD_FOLDER} — which one is meant is not this script's guess:\n` +
        entries.map(entry => `  ${describeEntry(entry)}`).join("\n") +
        `\nName one ("${newest!.name}"), or pass --latest to take the most recently updated.`
    )
  }

  return path.posix.join(UPLOAD_FOLDER, newest!.name)
}

async function downloadWorkbook({ bucket, objectPath }: Source): Promise<Buffer> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(bucket).download(objectPath)

  if (error || !data) {
    const detail = error?.message && error.message !== "{}" ? error.message : "not found or not readable"

    throw new Error(`Could not download ${bucket}/${objectPath}: ${detail}.`)
  }

  return Buffer.from(await data.arrayBuffer())
}

async function uploadFile({ bucket, objectPath, contents }: { bucket: string; objectPath: string; contents: Buffer }) {
  const supabase = createServiceClient()
  const { error } = await supabase.storage.from(bucket).upload(objectPath, contents, {
    contentType: contentTypeFor(fileFormatOf(objectPath)),
    upsert: true,
  })
  if (error) throw new Error(`Could not upload ${bucket}/${objectPath}: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)

  return { objectPath, url: data.publicUrl }
}

function readSheetRows(contents: Buffer, sheetName?: string) {
  const workbook = XLSX.read(contents, { type: "buffer" })

  const resolvedSheetName = sheetName ?? workbook.SheetNames[0]
  if (!resolvedSheetName) throw new Error("The file has no sheets")

  const sheet = workbook.Sheets[resolvedSheetName]
  if (!sheet) {
    throw new Error(`Sheet "${resolvedSheetName}" not found. Available: ${workbook.SheetNames.join(", ")}`)
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
    blankrows: true,
  })

  return { sheetName: resolvedSheetName, rows }
}

function pickCell(row: Record<string, unknown>, candidates: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    if (candidates.includes(normalizeKey(key))) return String(value ?? "").trim()
  }
  return ""
}

const isBlankRow = (row: Record<string, unknown>) =>
  Object.values(row).every(value => String(value ?? "").trim() === "")

function assertColumns(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {})
  const hasColumn = (candidates: string[]) => headers.some(header => candidates.includes(normalizeKey(header)))

  if (!hasColumn(ACCOUNT_NUMBER_HEADERS)) {
    throw new Error(
      `No account number column found. Headers in the file: ${headers.join(", ") || "(none)"}.\n` +
        `       Name that column one of: ${ACCOUNT_NUMBER_HEADERS.join(", ")}.`
    )
  }

  // Optionl Column
  if (!hasColumn(FC_EMAIL_HEADERS)) {
    console.warn(
      `\nNo FC email column found — every organization will be created without a Fundraising Consultant.\n` +
        `  Headers in the file: ${headers.join(", ")}\n` +
        `  To assign consultants, name that column one of: ${FC_EMAIL_HEADERS.join(", ")}\n`
    )
  }
}

// Created-by
async function resolveCreator(email?: string): Promise<UserSelect> {
  if (!email) {
    throw new Error(
      "--created-by is required: pass the email of the active Admin or WFC Admin the organizations should be created under."
    )
  }

  const allowedRoleLabels = BULK_CREATOR_ROLES.map(role => ROLES_DETAILS[role].label).join(" and ")

  const rows = (await usersGetAllByEmail({ input: { email } })).filter(row => !row.deletedAt)
  if (rows.length === 0) throw new Error(`--created-by: no user found for ${email}`)

  // An email can hold several role rows (multi-role), so look for the ones that may run this upload.
  const creatorRows = rows.filter(row => BULK_CREATOR_ROLES.includes(row.role as RolesEnum))
  if (creatorRows.length === 0) {
    const labels = Array.from(new Set(rows.map(row => ROLES_DETAILS[row.role as RolesEnum]?.label ?? row.role)))

    throw new Error(
      `--created-by: ${email} is a ${labels.join(", ")}. Bulk organization upload is restricted to ${allowedRoleLabels}.`
    )
  }

  const creator = creatorRows.find(row => row.status === UsersStatusEnum.ACTIVE)
  if (!creator) {
    const statuses = Array.from(new Set(creatorRows.map(row => row.status)))

    throw new Error(
      `--created-by: ${email} is ${statuses.join(", ")}, not active. ` +
        `Bulk organization upload requires an active ${allowedRoleLabels} account.`
    )
  }

  return creator
}

function parseRows(rows: Record<string, unknown>[]) {
  const parsed: ParsedRow[] = []
  const invalid: InvalidRow[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const accountNumber = pickCell(row, ACCOUNT_NUMBER_HEADERS)
    const fcEmail = pickCell(row, FC_EMAIL_HEADERS)

    if (isBlankRow(row)) return

    const parsedRow: ParsedRow = { rowNumber, accountNumber, fcEmail }

    if (!accountNumber) {
      invalid.push({ ...parsedRow, message: "Account number is required" })
      return
    }

    if (fcEmail && !emailSchema.safeParse(fcEmail.toLowerCase()).success) {
      invalid.push({ ...parsedRow, message: `Invalid FC email "${fcEmail}"` })
      return
    }

    parsed.push({ ...parsedRow, fcEmail: fcEmail.toLowerCase() })
  })

  return { parsed, invalid }
}

async function resolveRows(parsed: ParsedRow[]) {
  const invalid: InvalidRow[] = []
  const skipped: ResultRow[] = []
  const duplicates: DuplicateRow[] = []
  const toCreate: CreatableRow[] = []

  const accountsByNumber = await organizationsSearchSFAccountsByAccountNumbers({
    accountNumbers: parsed.map(row => row.accountNumber),
  })

  const fcResolutions = await organizationsResolveFCsByEmail({
    database: db,
    input: { emails: parsed.map(row => row.fcEmail).filter(Boolean) },
  })

  const existingOrganizations = await organizationsListBySFIdentifiers({
    database: db,
    input: {
      accountNumbers: parsed.map(row => row.accountNumber),
      sfAccountIds: Array.from(accountsByNumber.values()).flatMap(accounts => accounts.map(account => account.Id)),
    },
  })

  const existingByAccountNumber = new Map<string, OrganizationSelect>()
  const existingBySFAccountId = new Map<string, OrganizationSelect>()
  for (const organization of existingOrganizations) {
    if (organization.accountNumber) {
      existingByAccountNumber.set(normalizeAccountNumber(organization.accountNumber), organization)
    }
    if (organization.sfAccountId) existingBySFAccountId.set(organization.sfAccountId, organization)
  }

  const queuedBySFAccountId = new Map<string, number>()

  for (const row of parsed) {
    const accounts = accountsByNumber.get(normalizeAccountNumber(row.accountNumber)) ?? []

    if (accounts.length === 0) {
      invalid.push({ ...row, message: "No active Salesforce account with this account number" })
      continue
    }
    if (accounts.length > 1) {
      invalid.push({
        ...row,
        message: `Matches ${accounts.length} active Salesforce accounts (${accounts
          .map(account => account.Id)
          .join(", ")}) — resolve the duplicate in Salesforce first`,
      })
      continue
    }

    const account = accounts[0]!

    const existing =
      existingByAccountNumber.get(normalizeAccountNumber(row.accountNumber)) ?? existingBySFAccountId.get(account.Id)
    if (existing) {
      skipped.push({
        ...row,
        status: "skipped",
        message: `Organization already exists${existing.name ? ` as "${existing.name}"` : ""}`,
        organizationName: existing.name ?? "",
        organizationId: existing.id,
      })
      continue
    }

    const duplicateOf = queuedBySFAccountId.get(account.Id)
    if (duplicateOf) {
      duplicates.push({ ...row, duplicateOfRow: duplicateOf, organizationName: account.Name ?? "" })
      continue
    }

    let fcUserId: string | null = null
    if (row.fcEmail) {
      const resolution = fcResolutions.get(row.fcEmail)

      if (!resolution || resolution.status === "error") {
        invalid.push({ ...row, message: `FC email: ${resolution?.message ?? "could not be resolved"}` })
        continue
      }

      fcUserId = resolution.user.id
    }

    queuedBySFAccountId.set(account.Id, row.rowNumber)
    toCreate.push({ ...row, account, fcUserId })
  }

  return { invalid, skipped, duplicates, toCreate }
}

function toOrganizationInsert(row: CreatableRow, createdByUserId: string): OrganizationInsert {
  const address = row.account.BillingAddress

  return {
    createdByUserId,
    sfAccountId: row.account.Id,
    accountNumber: row.account.AccountNumber ?? "",
    name: row.account.Name ?? "",
    street: address?.street ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postalCode: address?.postalCode ?? "",
    fundraisingConsultantUserId: row.fcUserId,
    isBulkUpload: true,
  }
}

function serializeRows({
  rows,
  sheetName,
  format,
}: {
  rows: Record<string, string | number>[]
  sheetName: string
  format: FileFormat
}): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows)

  if (format === "csv") return Buffer.from(XLSX.utils.sheet_to_csv(worksheet), "utf8")

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

function buildReportFiles({
  baseName,
  stamp,
  format,
  results,
}: {
  baseName: string
  stamp: string
  format: FileFormat
  results: ResultRow[]
}): { fileName: string; contents: Buffer }[] {
  const resultRows = results.map(result => ({
    row: result.rowNumber,
    account_number: result.accountNumber,
    fc_email: result.fcEmail,
    status: result.status,
    message: result.message,
    organization: result.organizationName,
    organization_id: result.organizationId,
  }))
  const failedRows = results
    .filter(result => result.status === "error")
    .map(result => ({ account_number: result.accountNumber, fc_email: result.fcEmail }))

  if (format === "csv") {
    const files = [
      {
        fileName: `${baseName}-report-${stamp}.csv`,
        contents: serializeRows({ rows: resultRows, sheetName: "Results", format }),
      },
    ]
    if (failedRows.length > 0) {
      files.push({
        fileName: `${baseName}-failed-${stamp}.csv`,
        contents: serializeRows({ rows: failedRows, sheetName: "Failed", format }),
      })
    }

    return files
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resultRows), "Results")
  if (failedRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(failedRows), "Failed")
  }

  return [
    {
      fileName: `${baseName}-report-${stamp}.xlsx`,
      contents: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer,
    },
  ]
}

async function writeReport({ source, results }: { source: Source; results: ResultRow[] }): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const format = fileFormatOf(source.objectPath)

  const directory = path.posix.dirname(source.objectPath)
  const baseName = path.posix.basename(source.objectPath).replace(/\.(xlsx?|csv)$/i, "")
  const files = buildReportFiles({ baseName, stamp, format, results })

  const uploads = await Promise.all(
    files.map(file =>
      uploadFile({
        bucket: source.bucket,
        objectPath: path.posix.join(directory === "." ? "" : directory, REPORT_FOLDER, file.fileName),
        contents: file.contents,
      })
    )
  )

  return uploads
    .map(uploaded =>
      uploaded.url
        ? `${source.bucket}/${uploaded.objectPath}\n         ${uploaded.url}`
        : `${source.bucket}/${uploaded.objectPath}`
    )
    .join("\n         ")
}

const toErrorResult = (row: InvalidRow): ResultRow => ({
  ...row,
  status: "error",
  organizationName: "",
  organizationId: "",
})

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) {
    throw new Error(`--batch-size must be a positive integer, got "${args.batchSize}"`)
  }

  // Validate created-by
  const creator = await resolveCreator(args.createdBy)

  if (args.list) {
    const entries = await listFolderFiles({ bucket: args.bucket, folder: UPLOAD_FOLDER })

    console.log(`${args.bucket}/${UPLOAD_FOLDER}: ${entries.length} file(s) available to process`)
    for (const entry of entries) console.log(`  ${describeEntry(entry)}`)

    return 0
  }

  const objectPath = await resolveObjectPath({ bucket: args.bucket, fileName: args.fileName, latest: args.latest })
  fileFormatOf(objectPath)
  const source: Source = { bucket: args.bucket, objectPath }

  console.log(`Reading ${describeSource(source)}${args.dryRun ? " (dry-run)" : ""}`)
  console.log(`Creating as ${creator.email} (${ROLES_DETAILS[creator.role as RolesEnum]?.label ?? creator.role})`)

  const contents = await downloadWorkbook(source)

  const { sheetName, rows } = readSheetRows(contents, args.sheetName)
  console.log(`Sheet "${sheetName}": ${rows.length} data row(s)`)

  if (rows.length > 0) assertColumns(rows)

  const { parsed, invalid } = parseRows(rows)
  const resolved =
    parsed.length > 0
      ? await resolveRows(parsed)
      : {
          invalid: [] as InvalidRow[],
          skipped: [] as ResultRow[],
          duplicates: [] as DuplicateRow[],
          toCreate: [] as CreatableRow[],
        }

  const rejected = [...invalid, ...resolved.invalid].sort((first, second) => first.rowNumber - second.rowNumber)
  const { skipped, duplicates, toCreate } = resolved

  for (const skip of skipped) {
    console.log(`  row ${skip.rowNumber}: ${skip.accountNumber} — ${skip.message}, skipping`)
  }
  for (const duplicate of duplicates) {
    console.log(`  row ${duplicate.rowNumber}: ${duplicate.accountNumber} — repeat of row ${duplicate.duplicateOfRow}`)
  }
  for (const rejection of rejected) {
    console.error(
      `  row ${rejection.rowNumber}: ${rejection.accountNumber || "(no account number)"} — ${rejection.message}`
    )
  }

  console.log(
    `\n${toCreate.length} to create, ${skipped.length} already exist, ${duplicates.length} repeated in the file, ` +
      `${rejected.length} rejected.` +
      (rejected.length > 0 ? " Rejected rows are listed in the report — fix and re-upload just those." : "")
  )

  if (args.dryRun) {
    const reportPath = await writeReport({
      source,
      results: [
        ...toCreate.map(row => ({
          ...row,
          status: "would_create",
          message: "Dry run — nothing created",
          organizationName: row.account.Name ?? "",
          organizationId: "",
        })),
        ...skipped,
        ...duplicates.map(row => ({
          ...row,
          status: "duplicate",
          message: `Duplicate of row ${row.duplicateOfRow} — would be created from that row`,
          organizationId: "",
        })),
        ...rejected.map(toErrorResult),
      ].sort((first, second) => first.rowNumber - second.rowNumber),
    })

    console.log(`Dry run complete, nothing written to the database.\nReport: ${reportPath}`)

    return rejected.length > 0 ? 1 : 0
  }

  const results: ResultRow[] = [...skipped, ...rejected.map(toErrorResult)]
  const createdByRow = new Map<number, OrganizationSelect>()
  const failureByRow = new Map<number, string>()
  let createdCount = 0
  let failedCount = rejected.length

  for (let start = 0; start < toCreate.length; start += args.batchSize) {
    const batch = toCreate.slice(start, start + args.batchSize)
    const batchResults = await organizationsCreateMany({
      database: db,
      input: batch.map(row => toOrganizationInsert(row, creator.id)),
    })

    batchResults.forEach((result, index) => {
      const row = batch[index]!

      if (result.status === "ok") {
        createdCount++
        createdByRow.set(row.rowNumber, result.organization)
        results.push({
          ...row,
          status: "created",
          message: "Organization created",
          organizationName: result.organization.name ?? "",
          organizationId: result.organization.id,
        })
        return
      }

      failedCount++
      failureByRow.set(row.rowNumber, result.message)
      results.push({ ...row, status: "error", message: result.message, organizationName: "", organizationId: "" })
      console.error(`  row ${row.rowNumber}: ${row.accountNumber} — ${result.message}`)
    })

    console.log(`Processed ${Math.min(start + batch.length, toCreate.length)}/${toCreate.length}`)
  }

  // handling duplicates
  for (const duplicate of duplicates) {
    const created = createdByRow.get(duplicate.duplicateOfRow)

    if (created) {
      results.push({
        ...duplicate,
        status: "duplicate",
        message: `Duplicate of row ${duplicate.duplicateOfRow} — organization created from that row`,
        organizationName: created.name ?? duplicate.organizationName,
        organizationId: created.id,
      })
      continue
    }

    failedCount++
    results.push({
      ...duplicate,
      status: "error",
      message: `Duplicate of row ${duplicate.duplicateOfRow}, which was not created: ${
        failureByRow.get(duplicate.duplicateOfRow) ?? "see that row"
      }`,
      organizationId: "",
    })
  }

  const reportPath = await writeReport({
    source,
    results: results.sort((first, second) => first.rowNumber - second.rowNumber),
  })

  console.log(
    `\nCreated: ${createdCount}  Skipped: ${skipped.length}  Duplicates: ${duplicates.length}  Failed: ${failedCount}`
  )
  console.log(`Report: ${reportPath}`)

  return failedCount > 0 ? 1 : 0
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("\nError:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
