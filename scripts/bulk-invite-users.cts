import "dotenv/config"
import path from "node:path"
import * as XLSX from "xlsx"
import { z } from "zod"

import { ALLOWED_INVITE_ROLES_BY_ROLE, ROLES_DETAILS, RolesEnum, isMultiRoleEligible } from "@/constants/roles"
import { USER_STATUS_DETAILS, UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import { createServiceClient } from "@/lib/supabase/service-client"
import { db } from "@/server/db"
import { type UserInsert, type UserSelect } from "@/server/db/schema"
import { usersFindUpdateOrInviteMany } from "@/server/services/users/users-find-update-or-invite-many"
import { usersGetAllByEmail } from "@/server/services/users/users-get-all-by-email"

const DEFAULT_BATCH_SIZE = 25

const DEFAULT_BUCKET = "bulk-uploads"

const DEFAULT_FOLDER = "WFC Users"
const REPORT_FOLDER = "Report"

const BULK_UPLOADABLE_ROLES: ReadonlyArray<RolesEnum> = [RolesEnum.WFC_ADMIN, RolesEnum.SALES_REPRESENTATIVE]

const uploadableRoleLabels = () => BULK_UPLOADABLE_ROLES.map(role => ROLES_DETAILS[role].label).join(" and ")

const REQUIRED_INVITER_ROLES: ReadonlyArray<RolesEnum> = [RolesEnum.WFC_ADMIN, RolesEnum.ADMIN]

const requiredInviterLabels = () => REQUIRED_INVITER_ROLES.map(role => ROLES_DETAILS[role].label).join(" or ")

function allowedRolesFor(inviterRole: RolesEnum): RolesEnum[] {
  const allowedByApp = ALLOWED_INVITE_ROLES_BY_ROLE[inviterRole] ?? []

  return BULK_UPLOADABLE_ROLES.filter(role => allowedByApp.includes(role))
}

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const CSV_MIME_TYPE = "text/csv"

type FileFormat = "csv" | "xlsx"

const EMAIL_HEADERS = ["email", "e_mail", "email_address"]
const ROLE_HEADERS = ["role", "user_role"]

type ParsedRow = { rowNumber: number; email: string; role: RolesEnum }
type InvalidRow = { rowNumber: number; email: string; role: string; message: string }
type ResultRow = { rowNumber: number; email: string; role: string; status: string; message: string }

const emailSchema = z.email("Invalid email")

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

/** Accepts both the stored enum value (`sales_representative`) and the UI label ("Fundraising Consultant"). */
const ROLE_BY_KEY: Record<string, RolesEnum> = Object.fromEntries(
  Object.values(RolesEnum).flatMap(role => [
    [normalizeKey(role), role],
    [normalizeKey(ROLES_DETAILS[role].label), role],
  ])
)

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
    // Undefined means "discover the one file in DEFAULT_FOLDER"; a value overrides that.
    objectPath: positionals[0],
    folder: flags.get("folder") ?? DEFAULT_FOLDER,
    bucket: flags.get("bucket") ?? DEFAULT_BUCKET,
    sheetName: flags.get("sheet"),
    invitedBy: flags.get("invited-by"),
    batchSize: Number(flags.get("batch-size") ?? DEFAULT_BATCH_SIZE),
    dryRun: flags.has("dry-run"),
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

async function discoverObjectPath({ bucket, folder }: { bucket: string; folder: string }): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(bucket).list(folder)

  if (error) throw new Error(`Could not list ${bucket}/${folder}: ${error.message}`)

  const files = (data ?? []).filter(entry => entry.id && /\.(csv|xlsx?)$/i.test(entry.name)).map(entry => entry.name)

  if (files.length === 0) {
    throw new Error(
      `No .csv or .xlsx file in ${bucket}/${folder}. Upload one in the Supabase dashboard, or pass a path explicitly.`
    )
  }
  if (files.length > 1) {
    throw new Error(
      `${bucket}/${folder} holds ${files.length} files (${files.join(", ")}). Leave exactly one there, ` +
        `or name the one you want: yarn script:bulk-invite-users "${folder}/${files[0]}"`
    )
  }

  return path.posix.join(folder, files[0]!)
}

async function downloadWorkbook({ bucket, objectPath }: { bucket: string; objectPath: string }): Promise<Buffer> {
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

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false })

  return { sheetName: resolvedSheetName, rows }
}

function pickCell(row: Record<string, unknown>, candidates: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    if (candidates.includes(normalizeKey(key))) return String(value ?? "").trim()
  }
  return ""
}

async function resolveInviter(email?: string): Promise<UserSelect> {
  if (!email || email === "true") {
    throw new Error(
      `--invited-by is required. Pass the ${requiredInviterLabels()} the invitations should be attributed ` +
        `to, using "=" — for example --invited-by=someone@wfchocolate.com`
    )
  }

  const normalized = email.trim().toLowerCase()
  if (!emailSchema.safeParse(normalized).success) {
    throw new Error(`--invited-by: "${email}" is not a valid email address`)
  }

  const rows = await usersGetAllByEmail({ input: { email: normalized } })
  if (rows.length === 0) {
    throw new Error(`--invited-by: no account found for ${normalized}`)
  }

  const candidates = rows.filter(row => REQUIRED_INVITER_ROLES.includes(row.role as RolesEnum))
  if (candidates.length === 0) {
    const labels = Array.from(
      new Set(rows.map(row => ROLES_DETAILS[row.role as RolesEnum]?.label).filter(Boolean))
    ).join(", ")

    throw new Error(`--invited-by must be a ${requiredInviterLabels()}, but ${normalized} is registered as ${labels}`)
  }

  const inviter = candidates.find(row => !row.deletedAt && row.status === UsersStatusEnum.ACTIVE)
  if (!inviter) {
    const detail = candidates
      .map(row => {
        const label = ROLES_DETAILS[row.role as RolesEnum].label
        const status = row.deletedAt
          ? "Removed"
          : (USER_STATUS_DETAILS[row.status as UsersStatusEnum]?.label ?? row.status)

        return `${label} (${status})`
      })
      .join(", ")

    throw new Error(
      `--invited-by must be an active ${requiredInviterLabels()}, but ${normalized} is ${detail}. ` +
        `Only a fully onboarded account can be recorded as the inviter.`
    )
  }

  return inviter
}

function parseRows(rows: Record<string, unknown>[], allowedRoles: RolesEnum[]) {
  const parsed: ParsedRow[] = []
  const invalid: InvalidRow[] = []
  const seen = new Map<string, number>()
  const rolesByEmail = new Map<string, Set<RolesEnum>>()

  rows.forEach((row, index) => {
    const rowNumber = typeof row.__rowNum__ === "number" ? row.__rowNum__ + 1 : index + 2
    const rawEmail = pickCell(row, EMAIL_HEADERS)
    const rawRole = pickCell(row, ROLE_HEADERS)

    if (!rawEmail && !rawRole) return

    const email = rawEmail.toLowerCase()
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) {
      invalid.push({
        rowNumber,
        email: rawEmail,
        role: rawRole,
        message: rawEmail ? "Invalid email" : "Email is required",
      })
      return
    }

    const role = ROLE_BY_KEY[normalizeKey(rawRole)]
    if (!role) {
      invalid.push({
        rowNumber,
        email,
        role: rawRole,
        message: rawRole ? `Unknown role "${rawRole}"` : "Role is required",
      })
      return
    }
    if (!BULK_UPLOADABLE_ROLES.includes(role)) {
      invalid.push({
        rowNumber,
        email,
        role: rawRole,
        message: `Only ${uploadableRoleLabels()} can be bulk-invited — got ${ROLES_DETAILS[role].label}`,
      })
      return
    }
    if (!allowedRoles.includes(role)) {
      invalid.push({ rowNumber, email, role: rawRole, message: `Not allowed to invite ${ROLES_DETAILS[role].label}` })
      return
    }

    const key = `${email}|${role}`
    const duplicateOf = seen.get(key)
    if (duplicateOf) {
      invalid.push({ rowNumber, email, role: rawRole, message: `Duplicate of row ${duplicateOf}` })
      return
    }
    seen.set(key, rowNumber)

    const roles = rolesByEmail.get(email) ?? new Set<RolesEnum>()
    roles.add(role)
    rolesByEmail.set(email, roles)

    parsed.push({ rowNumber, email, role })
  })

  const conflictingEmails = new Map<string, RolesEnum[]>()
  for (const [email, roles] of rolesByEmail) {
    const roleList = Array.from(roles)
    if (roleList.length < 2 || roleList.every(isMultiRoleEligible)) continue
    conflictingEmails.set(email, roleList)
  }

  const accepted = parsed.filter(row => {
    const conflict = conflictingEmails.get(row.email)
    if (!conflict) return true

    invalid.push({
      rowNumber: row.rowNumber,
      email: row.email,
      role: ROLES_DETAILS[row.role].label,
      message: `Listed with multiple roles (${conflict.map(role => ROLES_DETAILS[role].label).join(", ")}) — each needs a separate email`,
    })

    return false
  })

  return { parsed: accepted, invalid }
}

async function preflightAgainstDatabase(parsed: ParsedRow[]) {
  const blocked: InvalidRow[] = []
  const skipped: ResultRow[] = []
  const toInvite: ParsedRow[] = []

  const emails = Array.from(new Set(parsed.map(row => row.email)))
  const existingByEmail = new Map<string, UserSelect[]>()
  for (const email of emails) {
    existingByEmail.set(email, await usersGetAllByEmail({ input: { email } }))
  }

  for (const row of parsed) {
    const existing = existingByEmail.get(row.email) ?? []
    const label = ROLES_DETAILS[row.role].label
    const sameRoleRow = existing.find(candidate => candidate.role === row.role)

    if (sameRoleRow?.deletedAt) {
      blocked.push({ ...row, role: label, message: `Previously removed as ${label} — use a different email` })
      continue
    }

    if (sameRoleRow?.status === UsersStatusEnum.INACTIVE) {
      blocked.push({
        ...row,
        role: label,
        message: `Inactive ${label} account — reactivate it in the app instead of inviting`,
      })
      continue
    }
    if (sameRoleRow) {
      const statusLabel = USER_STATUS_DETAILS[sameRoleRow.status as UsersStatusEnum]?.label ?? sameRoleRow.status
      const suffix = sameRoleRow.status === UsersStatusEnum.ACTIVE ? "" : ` — the account is ${statusLabel}`
      const message = sameRoleRow.clerkInvitationSentAt
        ? `Already registered with this role${suffix}`
        : "Already registered with this role, but no invitation was ever sent — resend it from the app"

      skipped.push({ ...row, role: label, status: "skipped", message })
      continue
    }

    const labelsOf = (rows: UserSelect[]) =>
      Array.from(
        new Set(
          rows
            .map(candidate => {
              const roleLabel = ROLES_DETAILS[candidate.role as RolesEnum]?.label
              if (!roleLabel) return null
              if (candidate.status === UsersStatusEnum.ACTIVE) return roleLabel
              const statusLabel = USER_STATUS_DETAILS[candidate.status as UsersStatusEnum]?.label ?? candidate.status

              return `${roleLabel} (${statusLabel})`
            })
            .filter(Boolean)
        )
      )

    if (existing.length > 0 && !isMultiRoleEligible(row.role)) {
      const liveLabels = labelsOf(existing.filter(candidate => !candidate.deletedAt))
      const registeredAs = liveLabels.length > 0 ? liveLabels.join(", ") : "a role that has since been removed"

      blocked.push({
        ...row,
        role: label,
        message: `Already registered as ${registeredAs} — ${label} must use a different email`,
      })
      continue
    }

    const blockingRow = existing.find(candidate => !isMultiRoleEligible(candidate.role as RolesEnum))
    if (blockingRow) {
      const blockingLabel = ROLES_DETAILS[blockingRow.role as RolesEnum].label
      blocked.push({ ...row, role: label, message: `Already registered as ${blockingLabel} — cannot also be ${label}` })
      continue
    }

    toInvite.push(row)
  }

  return { blocked, skipped, toInvite }
}

async function assertAppReachable() {
  try {
    await fetch(env.NEXT_PUBLIC_APP_URL, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new Error(
      `${env.NEXT_PUBLIC_APP_URL} is not reachable. Invitations are sent through that app — start it (or point ` +
        `NEXT_PUBLIC_APP_URL at the deployed environment) before running the upload.`
    )
  }
}

function toUserInsert(row: ParsedRow, invitedByUserId: string): UserInsert {
  const firstName = row.email.split("@")[0] ?? row.email

  return {
    email: row.email,
    role: row.role,
    status: UsersStatusEnum.PENDING,
    invitedByUserId,
    isBulkUpload: true,
    firstName,
    fullName: firstName,
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
    email: result.email,
    role: result.role,
    status: result.status,
    message: result.message,
  }))
  const failedRows = results
    .filter(result => result.status === "error")
    .map(result => ({ email: result.email, role: result.role }))

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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) {
    throw new Error(`--batch-size must be a positive integer, got "${args.batchSize}"`)
  }

  // validate inviter
  const inviter = await resolveInviter(args.invitedBy)
  const allowedRoles = allowedRolesFor(inviter.role as RolesEnum)

  if (allowedRoles.length === 0) {
    throw new Error(
      `${inviter.email} is a ${ROLES_DETAILS[inviter.role as RolesEnum].label} and cannot bulk-invite any role.`
    )
  }

  const objectPath = args.objectPath ?? (await discoverObjectPath({ bucket: args.bucket, folder: args.folder }))

  fileFormatOf(objectPath)
  const source: Source = { bucket: args.bucket, objectPath }

  console.log(`Reading ${describeSource(source)}${args.dryRun ? " (dry-run)" : ""}`)
  console.log(`Inviting as ${inviter.email} (${ROLES_DETAILS[inviter.role as RolesEnum].label})`)

  const contents = await downloadWorkbook(source)

  const { sheetName, rows } = readSheetRows(contents, args.sheetName)
  console.log(`Sheet "${sheetName}": ${rows.length} data row(s)`)

  const { parsed, invalid } = parseRows(rows, allowedRoles)
  const { blocked, skipped, toInvite } =
    parsed.length > 0 ? await preflightAgainstDatabase(parsed) : { blocked: [], skipped: [], toInvite: [] }

  const preflightErrors = [...invalid, ...blocked].sort((a, b) => a.rowNumber - b.rowNumber)

  if (preflightErrors.length > 0) {
    const reportPath = await writeReport({
      source,
      results: preflightErrors.map(error => ({ ...error, status: "error" })),
    })

    console.error(`\nPreflight failed — ${preflightErrors.length} invalid row(s). Nothing was created.`)
    for (const error of preflightErrors.slice(0, 20)) {
      console.error(`  row ${error.rowNumber}: ${error.email || "(no email)"} — ${error.message}`)
    }
    if (preflightErrors.length > 20) console.error(`  ...and ${preflightErrors.length - 20} more`)

    if (preflightErrors.some(error => /^(Unknown role|Not allowed to invite|Only )/.test(error.message))) {
      console.error("\nRoles this run can invite (either value works):")
      for (const role of allowedRoles) {
        console.error(`  ${role.padEnd(24)} "${ROLES_DETAILS[role].label}"`)
      }
    }
    console.error(`\nReport: ${reportPath}`)

    return 1
  }

  for (const skip of skipped) {
    console.log(`  row ${skip.rowNumber}: ${skip.email} — ${skip.message}, skipping`)
  }

  console.log(`\nPreflight passed. ${toInvite.length} to invite, ${skipped.length} already registered.`)

  if (args.dryRun) {
    const reportPath = await writeReport({
      source,
      results: [
        ...toInvite.map(row => ({
          ...row,
          role: ROLES_DETAILS[row.role].label,
          status: "would_invite",
          message: "Dry run — no invitation sent",
        })),
        ...skipped,
      ].sort((a, b) => a.rowNumber - b.rowNumber),
    })

    console.log(`Dry run complete, nothing written to the database.\nReport: ${reportPath}`)

    return 0
  }

  if (toInvite.length > 0) await assertAppReachable()

  const results: ResultRow[] = [...skipped]
  let invitedCount = 0
  let failedCount = 0

  for (let start = 0; start < toInvite.length; start += args.batchSize) {
    const batch = toInvite.slice(start, start + args.batchSize)
    const batchResults = await usersFindUpdateOrInviteMany({
      database: db,
      input: batch.map(row => toUserInsert(row, inviter.id)),
    })

    batchResults.forEach((result, index) => {
      const row = batch[index]!
      const label = ROLES_DETAILS[row.role].label

      if (result.status === "ok") {
        invitedCount++
        results.push({ ...row, role: label, status: "invited", message: "Invitation sent" })
        return
      }

      failedCount++
      results.push({ ...row, role: label, status: "error", message: result.message })
      console.error(`  row ${row.rowNumber}: ${row.email} — ${result.message}`)
    })

    console.log(`Processed ${Math.min(start + batch.length, toInvite.length)}/${toInvite.length}`)
  }

  const reportPath = await writeReport({
    source,
    results: results.sort((a, b) => a.rowNumber - b.rowNumber),
  })

  console.log(`\nInvited: ${invitedCount}  Skipped: ${skipped.length}  Failed: ${failedCount}`)
  console.log(`Report: ${reportPath}`)

  return failedCount > 0 ? 1 : 0
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("\nError:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
