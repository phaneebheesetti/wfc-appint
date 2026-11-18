import "dotenv/config"
import { type SQL, eq, getTableName, inArray, sql } from "drizzle-orm"
import path from "node:path"
import * as XLSX from "xlsx"

import { RolesEnum } from "@/constants/roles"
import { createServiceClient } from "@/lib/supabase/service-client"
import { db } from "@/server/db"
import {
  type OrganizationSelect,
  campaignAnnouncements,
  campaigns,
  campaignsUsers,
  casesTransactions,
  channels,
  documents,
  events,
  organizations,
  organizationsUsers,
  paymentLogs,
  prizes,
  users,
} from "@/server/db/schema"

const DEFAULT_BUCKET = "bulk-uploads"

const UPLOAD_FOLDER = "Merge Organizations"
const REPORT_FOLDER = "Report"

const SPREADSHEET_PATTERN = /\.(csv|xlsx?)$/i

const NON_INPUT_PATTERNS = [/-report-/i, /^~\$/]

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const CSV_MIME_TYPE = "text/csv"

const ORGANIZATION_ID_COLUMN = "organization_id"
const UPDATED_AT_COLUMN = "updated_at"

type FileFormat = "csv" | "xlsx"

const ORGANIZATION_NAME_HEADERS = ["organization_name", "org_name", "name", "organization"]
const ACCOUNT_NUMBER_HEADERS = ["account_number", "accountnumber", "account_no", "sf_account_number"]

const MERGE_TABLES = [
  campaigns,
  campaignsUsers,
  campaignAnnouncements,
  casesTransactions,
  channels,
  documents,
  events,
  organizationsUsers,
  paymentLogs,
  prizes,
].map(getTableName)

const ORGANIZATIONS_USERS_TABLE = getTableName(organizationsUsers)

const OWN_COLUMNS = [
  "stripeConnectedAccountId",
  "adminUserId",
  "accountNumber",
  "name",
  "street",
  "city",
  "state",
  "postalCode",
  "country",
] as const satisfies readonly (keyof OrganizationSelect)[]

const CASE_INSENSITIVE_TEXT_COLUMNS: readonly string[] = ["name", "street", "city", "state", "postalCode", "country"]

const COPY_FORWARD_COLUMNS: readonly string[] = ["stripeConnectedAccountId", "adminUserId"]

type Fill = { column: keyof OrganizationSelect; value: string | null }

type ObservationType =
  | "missing_organization_name"
  | "missing_account_number"
  | "duplicate_input_row"
  | "destination_not_found"
  | "destination_deleted"
  | "ambiguous_destination"
  | "source_not_found"
  | "source_deleted"
  | "ambiguous_source"
  | "source_has_account_number"
  | "destination_reused"
  | "source_reused"
  | "member_kept"
  | "filled_from_source"
  | "value_mismatch"
  | "case_mismatch"
  | "fc_mismatch"
  | "verification_failed"
  | "count_mismatch"
  | "merge_failed"

const BLOCKING_OBSERVATIONS: readonly ObservationType[] = [
  "missing_organization_name",
  "missing_account_number",
  "duplicate_input_row",
  "destination_not_found",
  "destination_deleted",
  "ambiguous_destination",
  "source_not_found",
  "source_deleted",
  "ambiguous_source",
  "source_has_account_number",
  "destination_reused",
  "source_reused",
  "verification_failed",
  "count_mismatch",
  "merge_failed",
]

type ParsedRow = { rowNumber: number; organizationName: string; accountNumber: string }

type Observation = {
  rowNumber: number
  organizationName: string
  accountNumber: string
  type: ObservationType
  detail: string
  column?: string
  sourceValue?: string
  destinationValue?: string
}

type ResolvedPair = ParsedRow & { source: OrganizationSelect; destination: OrganizationSelect }

type SqlExecutor = { execute: (query: SQL) => Promise<unknown> }

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

  const unknown = [...flags.keys()].filter(name => !["bucket", "sheet", "dry-run", "list", "latest"].includes(name))

  const REMOVED: Record<string, string> = {
    windows:
      "--windows was removed: the merge no longer uses created_at at all. The source is the live org " +
      "matching organization_name with a NULL account_number, and the destination is the live org " +
      "matching account_number.",
    discover:
      "--discover was removed. It proposed pairs by looking for same-named orgs, which is only a guess " +
      "at what a row means now that organization_name and account_number identify the two sides " +
      "independently. Build the input file directly instead, and check it with --dry-run.",
  }

  if (unknown.length > 0) {
    throw new Error(
      `Unknown flag(s): ${unknown.map(name => `--${name}`).join(", ")}. Supported: --bucket=, --sheet=, ` +
        `--dry-run, --list, --latest.` +
        unknown
          .filter(name => REMOVED[name])
          .map(name => `\n       ${REMOVED[name]}`)
          .join("")
    )
  }

  return {
    fileName: positionals[0],
    bucket: flags.get("bucket") ?? DEFAULT_BUCKET,
    sheetName: flags.get("sheet"),
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

const asRows = <T>(result: unknown): T[] => (Array.isArray(result) ? (result as T[]) : [])

async function assertMergeTables() {
  const rows = asRows<{ table_name: string; column_name: string }>(
    await db.execute(sql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in (${sql.join(
          MERGE_TABLES.map(table => sql`${table}`),
          sql`, `
        )})
        and column_name in (${ORGANIZATION_ID_COLUMN}, ${UPDATED_AT_COLUMN}, 'id')
    `)
  )

  const columnsByTable = new Map<string, Set<string>>()
  for (const row of rows) {
    columnsByTable.set(row.table_name, (columnsByTable.get(row.table_name) ?? new Set()).add(row.column_name))
  }

  const problems = MERGE_TABLES.flatMap(table => {
    const columns = columnsByTable.get(table)
    if (!columns) return [`${table}: table not found in schema "public"`]

    const missing = ["id", ORGANIZATION_ID_COLUMN, UPDATED_AT_COLUMN].filter(column => !columns.has(column))

    return missing.length > 0 ? [`${table}: missing column(s) ${missing.join(", ")}`] : []
  })

  if (problems.length > 0) {
    throw new Error(`The merge tables do not match what this script expects:\n  ${problems.join("\n  ")}`)
  }
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

function pickRawCell(row: Record<string, unknown>, candidates: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    if (candidates.includes(normalizeKey(key))) return String(value ?? "")
  }

  return ""
}

const isBlankRow = (row: Record<string, unknown>) =>
  Object.values(row).every(value => String(value ?? "").trim() === "")

function assertColumns(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {})
  const hasColumn = (candidates: string[]) => headers.some(header => candidates.includes(normalizeKey(header)))

  const missing: string[] = []
  if (!hasColumn(ORGANIZATION_NAME_HEADERS)) missing.push(`organization name (${ORGANIZATION_NAME_HEADERS.join(", ")})`)
  if (!hasColumn(ACCOUNT_NUMBER_HEADERS)) missing.push(`account number (${ACCOUNT_NUMBER_HEADERS.join(", ")})`)

  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(" and ")}.\n` +
        `       Headers in the file: ${headers.join(", ") || "(none)"}`
    )
  }
}

function parseRows(rows: Record<string, unknown>[]) {
  const parsed: ParsedRow[] = []
  const observations: Observation[] = []
  const seen = new Map<string, number>()

  rows.forEach((row, index) => {
    if (isBlankRow(row)) return

    const rowNumber = index + 2
    const organizationName = pickRawCell(row, ORGANIZATION_NAME_HEADERS)
    const accountNumber = pickRawCell(row, ACCOUNT_NUMBER_HEADERS)
    const base = { rowNumber, organizationName, accountNumber }

    if (organizationName.trim() === "") {
      observations.push({ ...base, type: "missing_organization_name", detail: "Organization name is required" })
      return
    }
    if (accountNumber.trim() === "") {
      observations.push({ ...base, type: "missing_account_number", detail: "Account number is required" })
      return
    }

    const key = JSON.stringify([organizationName, accountNumber])
    const firstSeenAt = seen.get(key)
    if (firstSeenAt) {
      observations.push({
        ...base,
        type: "duplicate_input_row",
        detail: `Same organization name and account number as row ${firstSeenAt}; that row is the one processed`,
      })
      return
    }

    seen.set(key, rowNumber)
    parsed.push(base)
  })

  return { parsed, observations }
}

const findByName = (name: string) => db.select().from(organizations).where(eq(organizations.name, name))

const findByAccountNumber = (accountNumber: string) =>
  db.select().from(organizations).where(eq(organizations.accountNumber, accountNumber))

const renderAccountNumber = (accountNumber: string | null) => (accountNumber === null ? "null" : `"${accountNumber}"`)

const describeCandidate = (candidate: OrganizationSelect) =>
  `${candidate.id} name="${candidate.name ?? ""}" account=${renderAccountNumber(candidate.accountNumber)} ` +
  `created_at=${candidate.createdAt.toISOString()} deleted_at=${candidate.deletedAt?.toISOString() ?? "null"}`

const describeCandidates = (candidates: OrganizationSelect[]) => candidates.map(describeCandidate).join(" | ")

const isEligibleSourceAccountNumber = (candidate: OrganizationSelect) => candidate.accountNumber === null

async function resolvePair(row: ParsedRow): Promise<{ pair?: ResolvedPair; observations: Observation[] }> {
  const observations: Observation[] = []
  const observe = (type: ObservationType, detail: string) => observations.push({ ...row, type, detail })

  const [byName, byAccount] = await Promise.all([
    findByName(row.organizationName),
    findByAccountNumber(row.accountNumber),
  ])

  if (byAccount.length === 0) {
    observe(
      "destination_not_found",
      `No organization holds account number "${row.accountNumber}". Compared exactly as it appears in the ` +
        `spreadsheet — same casing, no trimming.`
    )

    return { observations }
  }

  const liveDestinations = byAccount.filter(candidate => !candidate.deletedAt)

  if (liveDestinations.length === 0) {
    observe(
      "destination_deleted",
      `Every organization holding account number "${row.accountNumber}" is soft-deleted, and a destination must ` +
        `be live. Candidates: ${describeCandidates(byAccount)}`
    )

    return { observations }
  }

  if (liveDestinations.length > 1) {
    observe(
      "ambiguous_destination",
      `${liveDestinations.length} live organizations hold account number "${row.accountNumber}". ` +
        `Candidates: ${describeCandidates(liveDestinations)}`
    )

    return { observations }
  }

  const destination = liveDestinations[0]!

  if (byName.length === 0) {
    observe(
      "source_not_found",
      `No organization is named "${row.organizationName}". Compared exactly as it appears in the spreadsheet — ` +
        `same casing, no trimming.`
    )

    return { observations }
  }

  const liveSources = byName.filter(candidate => !candidate.deletedAt)

  if (liveSources.length === 0) {
    observe(
      "source_deleted",
      `Every organization named "${row.organizationName}" is soft-deleted, and a source must be live. ` +
        `Candidates: ${describeCandidates(byName)}`
    )

    return { observations }
  }

  const sourceCandidates = liveSources.filter(candidate => candidate.id !== destination.id)

  const judged = sourceCandidates.length > 0 ? sourceCandidates : liveSources
  const ineligible = judged.filter(candidate => !isEligibleSourceAccountNumber(candidate))

  if (ineligible.length > 0) {
    const onlyEmptyStrings = ineligible.every(candidate => candidate.accountNumber === "")
    const isDestinationItself = ineligible.some(candidate => candidate.id === destination.id)

    observe(
      "source_has_account_number",
      (onlyEmptyStrings
        ? `An organization named "${row.organizationName}" has account_number "" rather than NULL. A source must ` +
          `have never had an account number at all, and "" is not that — it is an org that has been through an ` +
          `account-number flow and come out empty. `
        : `An organization named "${row.organizationName}" already carries an account number, so it is not a ` +
          `stray duplicate and this name does not unambiguously identify a source. `) +
        (isDestinationItself
          ? `The only live organization with this name is the destination ${destination.id} itself, so this row ` +
            `names one organization rather than a pair — nothing to merge. This is also what an already-merged ` +
            `row looks like on a re-run, once its source has been soft-deleted. `
          : "") +
        `Candidates: ${describeCandidates(ineligible)}`
    )

    return { observations }
  }

  if (sourceCandidates.length > 1) {
    observe(
      "ambiguous_source",
      `${sourceCandidates.length} live organizations named "${row.organizationName}" have a NULL account_number. ` +
        `Candidates: ${describeCandidates(sourceCandidates)}`
    )

    return { observations }
  }

  return { pair: { ...row, source: sourceCandidates[0]!, destination }, observations }
}

function checkCrossRow(pairs: ResolvedPair[]) {
  const blocked = new Set<number>()
  const observations: Observation[] = []

  const sourcesById = new Map<string, ResolvedPair[]>()
  const destinationsById = new Map<string, ResolvedPair[]>()

  for (const pair of pairs) {
    sourcesById.set(pair.source.id, [...(sourcesById.get(pair.source.id) ?? []), pair])
    destinationsById.set(pair.destination.id, [...(destinationsById.get(pair.destination.id) ?? []), pair])
  }

  const describeRows = (group: ResolvedPair[]) => group.map(pair => `row ${pair.rowNumber}`).join(", ")

  for (const [destinationId, group] of destinationsById) {
    if (group.length < 2) continue

    for (const pair of group) blocked.add(pair.rowNumber)

    observations.push({
      ...group[0]!,
      type: "destination_reused",
      detail: `${describeRows(group)} all target destination ${destinationId}. Resolve which source is the real duplicate.`,
    })
  }

  for (const [sourceId, group] of sourcesById) {
    if (group.length < 2) continue

    for (const pair of group) blocked.add(pair.rowNumber)

    observations.push({
      ...group[0]!,
      type: "source_reused",
      detail: `${describeRows(group)} all resolve to source ${sourceId}.`,
    })
  }

  return { blocked, observations }
}

const FC_ROLE: string = RolesEnum.SALES_REPRESENTATIVE

type EffectiveFc = { userId: string | null; via: "column" | "creator" | "none" }

type UserInfo = { role: string; email: string | null }

const effectiveFcOf = (organization: OrganizationSelect, usersById: Map<string, UserInfo>): EffectiveFc => {
  if (organization.fundraisingConsultantUserId) {
    return { userId: organization.fundraisingConsultantUserId, via: "column" }
  }

  if (usersById.get(organization.createdByUserId)?.role === FC_ROLE) {
    return { userId: organization.createdByUserId, via: "creator" }
  }

  return { userId: null, via: "none" }
}

async function fetchUsers(pairs: ResolvedPair[]) {
  const ids = new Set<string>()
  for (const pair of pairs) {
    for (const organization of [pair.source, pair.destination]) {
      ids.add(organization.createdByUserId)
      if (organization.fundraisingConsultantUserId) ids.add(organization.fundraisingConsultantUserId)
      if (organization.adminUserId) ids.add(organization.adminUserId)
    }
  }

  if (ids.size === 0) return new Map<string, UserInfo>()

  const rows = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(inArray(users.id, [...ids]))

  return new Map(rows.map(row => [row.id, { role: row.role, email: row.email }]))
}

const describeUser = (userId: string, usersById: Map<string, UserInfo>) => {
  const user = usersById.get(userId)
  if (!user) return `(user not found) ${userId}`

  return `${user.email ?? "(no email on record)"} ${userId}`
}

const describeFc = (fc: EffectiveFc, usersById: Map<string, UserInfo>) => {
  if (fc.via === "column") return `${describeUser(fc.userId!, usersById)} (fundraising_consultant_user_id)`
  if (fc.via === "creator") {
    return `${describeUser(fc.userId!, usersById)} (inherited from created_by_user_id, who holds the FC role)`
  }

  return "none (no FC column, and the creator does not hold the FC role)"
}

function findFcMismatch(pair: ResolvedPair, usersById: Map<string, UserInfo>) {
  const source = effectiveFcOf(pair.source, usersById)
  const destination = effectiveFcOf(pair.destination, usersById)

  if (source.userId === destination.userId) return null

  return { source, destination }
}

type SharedMember = { userId: string; sourceEligible: boolean; destinationEligible: boolean }

async function findSharedMembers({ source, destination }: ResolvedPair): Promise<SharedMember[]> {
  const rows = await db
    .select({
      userId: organizationsUsers.userId,
      organizationId: organizationsUsers.organizationId,
      eligible: organizationsUsers.eligible,
    })
    .from(organizationsUsers)
    .where(inArray(organizationsUsers.organizationId, [source.id, destination.id]))

  const sourceRows = new Map(rows.filter(row => row.organizationId === source.id).map(row => [row.userId, row]))

  return rows
    .filter(row => row.organizationId === destination.id && sourceRows.has(row.userId))
    .map(row => ({
      userId: row.userId,
      sourceEligible: sourceRows.get(row.userId)!.eligible,
      destinationEligible: row.eligible,
    }))
}

function findColumnDifferences({ source, destination }: ResolvedPair) {
  const render = (value: OrganizationSelect[keyof OrganizationSelect]) =>
    value === null || value === undefined ? "" : String(value)

  return OWN_COLUMNS.flatMap(column => {
    const sourceValue = render(source[column])
    const destinationValue = render(destination[column])

    if (sourceValue === destinationValue) return []

    const type = ((): ObservationType => {
      if (destinationValue === "") {
        return COPY_FORWARD_COLUMNS.includes(column) ? "filled_from_source" : "value_mismatch"
      }

      if (
        CASE_INSENSITIVE_TEXT_COLUMNS.includes(column) &&
        sourceValue.toLowerCase() === destinationValue.toLowerCase()
      ) {
        return "case_mismatch"
      }

      return "value_mismatch"
    })()

    return [{ column, sourceValue, destinationValue, type }]
  })
}

async function countRows(executor: SqlExecutor, table: string, organizationId: string) {
  const rows = asRows<{ value: number }>(
    await executor.execute(
      sql`select count(*)::int as value from ${sql.identifier(table)} where ${sql.identifier(ORGANIZATION_ID_COLUMN)} = ${organizationId}::uuid`
    )
  )

  return Number(rows[0]?.value ?? 0)
}

async function snapshotCounts(executor: SqlExecutor, organizationId: string) {
  const counts = new Map<string, number>()

  for (const table of MERGE_TABLES) counts.set(table, await countRows(executor, table, organizationId))

  return counts
}

class MergeVerificationError extends Error {
  constructor(
    readonly type: ObservationType,
    message: string
  ) {
    super(message)
    this.name = "MergeVerificationError"
  }
}

type MergeOutcome =
  | { status: "merged"; moved: Map<string, string[]> }
  | { status: "failed"; type: ObservationType; detail: string }

async function mergePair(pair: ResolvedPair, keptUserIds: string[], fills: Fill[]): Promise<MergeOutcome> {
  const { source, destination } = pair

  const keptCountOf = (table: string) => (table === ORGANIZATIONS_USERS_TABLE ? keptUserIds.length : 0)

  const keepClause =
    keptUserIds.length > 0
      ? sql` and user_id not in (${sql.join(
          keptUserIds.map(userId => sql`${userId}::uuid`),
          sql`, `
        )})`
      : sql.empty()

  try {
    const moved = await db.transaction(async tx => {
      const locked = await tx
        .select({
          id: organizations.id,
          deletedAt: organizations.deletedAt,
          accountNumber: organizations.accountNumber,
        })
        .from(organizations)
        .where(inArray(organizations.id, [source.id, destination.id]))
        .for("update")

      for (const [role, id] of [
        ["source", source.id],
        ["destination", destination.id],
      ] as const) {
        const row = locked.find(candidate => candidate.id === id)

        if (!row) {
          throw new MergeVerificationError(
            role === "source" ? "source_deleted" : "destination_deleted",
            `The ${role} organization ${id} no longer exists. Rolled back.`
          )
        }

        if (row.deletedAt) {
          throw new MergeVerificationError(
            role === "source" ? "source_deleted" : "destination_deleted",
            `The ${role} organization ${id} was soft-deleted at ${row.deletedAt.toISOString()}, after this run ` +
              `resolved the pair. Both organizations must be live to merge. Rolled back.`
          )
        }
      }

      const lockedSource = locked.find(candidate => candidate.id === source.id)!
      if (lockedSource.accountNumber !== null) {
        throw new MergeVerificationError(
          "source_has_account_number",
          `Source ${source.id} now has account_number ${renderAccountNumber(lockedSource.accountNumber)}; a source ` +
            `must have NULL. Rolled back.`
        )
      }

      const before = await snapshotCounts(tx, source.id)
      const movedIds = new Map<string, string[]>()

      for (const table of MERGE_TABLES) {
        const exclusion = table === ORGANIZATIONS_USERS_TABLE ? keepClause : sql.empty()

        const rows = asRows<{ id: string }>(
          await tx.execute(sql`
            update ${sql.identifier(table)}
            set ${sql.identifier(ORGANIZATION_ID_COLUMN)} = ${destination.id}::uuid,
                ${sql.identifier(UPDATED_AT_COLUMN)} = now()
            where ${sql.identifier(ORGANIZATION_ID_COLUMN)} = ${source.id}::uuid${exclusion}
            returning id
          `)
        )

        movedIds.set(
          table,
          rows.map(row => row.id)
        )
      }

      if (fills.length > 0) {
        const assignments = fills.map(fill => sql`${sql.identifier(organizations[fill.column].name)} = ${fill.value}`)

        await tx.execute(sql`
          update ${organizations}
          set ${sql.join(assignments, sql`, `)}, ${sql.identifier(UPDATED_AT_COLUMN)} = now()
          where id = ${destination.id}::uuid
        `)
      }

      await tx.update(organizations).set({ deletedAt: new Date() }).where(eq(organizations.id, source.id))

      for (const table of MERGE_TABLES) {
        const expected = (before.get(table) ?? 0) - keptCountOf(table)
        const actual = movedIds.get(table)?.length ?? 0

        if (expected !== actual) {
          throw new MergeVerificationError(
            "count_mismatch",
            `${table}: expected to move ${expected} row(s), moved ${actual}. Rolled back — something wrote to ` +
              `organization ${source.id} while the merge was running.`
          )
        }
      }

      const after = await snapshotCounts(tx, source.id)
      const stragglers = [...after.entries()].filter(([table, value]) => value !== keptCountOf(table))
      if (stragglers.length > 0) {
        throw new MergeVerificationError(
          "verification_failed",
          `Wrong number of rows left on organization ${source.id} after the merge: ` +
            stragglers.map(([table, value]) => `${table}=${value} (expected ${keptCountOf(table)})`).join(", ") +
            ". Rolled back."
        )
      }

      const [sourceAfter] = await tx
        .select({ deletedAt: organizations.deletedAt, updatedAt: organizations.updatedAt })
        .from(organizations)
        .where(eq(organizations.id, source.id))

      if (!sourceAfter?.deletedAt) {
        throw new MergeVerificationError(
          "verification_failed",
          `deleted_at was not set on source ${source.id}. Rolled back.`
        )
      }

      if (!sourceAfter.updatedAt) {
        throw new MergeVerificationError(
          "verification_failed",
          `updated_at was not stamped on source ${source.id}. Rolled back.`
        )
      }

      return movedIds
    })

    return { status: "merged", moved }
  } catch (error) {
    if (error instanceof MergeVerificationError) {
      return { status: "failed", type: error.type, detail: error.message }
    }

    return {
      status: "failed",
      type: "merge_failed",
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

type ResultRow = Record<string, string | number>
type RollbackRow = { table: string; row_id: string; old_organization_id: string; new_organization_id: string }

function serializeRows({
  rows,
  sheetName,
  format,
}: {
  rows: ResultRow[]
  sheetName: string
  format: FileFormat
}): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows)

  if (format === "csv") return Buffer.from(XLSX.utils.sheet_to_csv(worksheet), "utf8")

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

async function writeReport({
  source,
  results,
  observations,
  rollback,
}: {
  source: Source
  results: ResultRow[]
  observations: Observation[]
  rollback: RollbackRow[]
}): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const format = fileFormatOf(source.objectPath)

  const directory = path.posix.dirname(source.objectPath)
  const baseName = path.posix.basename(source.objectPath).replace(/\.(xlsx?|csv)$/i, "")

  const observationRows: ResultRow[] = observations.map(observation => ({
    row: observation.rowNumber,
    organization_name: observation.organizationName,
    account_number: observation.accountNumber,
    observation_type: observation.type,
    column: observation.column ?? "",
    source_value: observation.sourceValue ?? "",
    destination_value: observation.destinationValue ?? "",
    detail: observation.detail,
  }))

  const rollbackRows: ResultRow[] = rollback.map(entry => ({ ...entry }))

  const sheets = [
    { name: "Results", rows: results },
    { name: "Observations", rows: observationRows },
    { name: "Rollback", rows: rollbackRows },
  ]

  let files: { fileName: string; contents: Buffer }[]

  if (format === "csv") {
    files = sheets.map(sheet => ({
      fileName: `${baseName}-report-${sheet.name.toLowerCase()}-${stamp}.csv`,
      contents: serializeRows({ rows: sheet.rows, sheetName: sheet.name, format }),
    }))
  } else {
    const workbook = XLSX.utils.book_new()
    for (const sheet of sheets) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows), sheet.name)
    }

    files = [
      {
        fileName: `${baseName}-report-${stamp}.xlsx`,
        contents: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer,
      },
    ]
  }

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

const summarizeCounts = (counts: Map<string, number>) =>
  MERGE_TABLES.map(table => `${table}=${counts.get(table) ?? 0}`).join(", ")

const totalOf = (counts: Map<string, number>) => [...counts.values()].reduce((total, value) => total + value, 0)

const countBlocking = (observations: Observation[]) =>
  observations.filter(observation => BLOCKING_OBSERVATIONS.includes(observation.type)).length

function summarizeObservations(observations: Observation[]) {
  if (observations.length === 0) return

  const counts = new Map<ObservationType, number>()
  for (const observation of observations) {
    counts.set(observation.type, (counts.get(observation.type) ?? 0) + 1)
  }

  console.log(`Observations (${countBlocking(observations)} blocking, ${observations.length} total):`)
  for (const [type, count] of [...counts].sort((first, second) => second[1] - first[1])) {
    console.log(`  ${BLOCKING_OBSERVATIONS.includes(type) ? "!" : " "} ${type}: ${count}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.list) {
    const entries = await listFolderFiles({ bucket: args.bucket, folder: UPLOAD_FOLDER })

    console.log(`${args.bucket}/${UPLOAD_FOLDER}: ${entries.length} file(s) available to process`)
    for (const entry of entries) console.log(`  ${describeEntry(entry)}`)

    return 0
  }

  await assertMergeTables()

  console.log("Resolution: organization_name -> source (account_number must be NULL)")
  console.log("            account_number    -> destination")

  const objectPath = await resolveObjectPath({ bucket: args.bucket, fileName: args.fileName, latest: args.latest })
  fileFormatOf(objectPath)
  const source: Source = { bucket: args.bucket, objectPath }

  console.log(`Reading ${describeSource(source)}${args.dryRun ? " (dry-run)" : ""}`)

  const contents = await downloadWorkbook(source)
  const { sheetName, rows } = readSheetRows(contents, args.sheetName)
  console.log(`Sheet "${sheetName}": ${rows.length} data row(s)`)

  if (rows.length > 0) assertColumns(rows)

  const { parsed, observations: parseObservations } = parseRows(rows)
  const observations: Observation[] = [...parseObservations]

  const pairs: ResolvedPair[] = []
  for (const row of parsed) {
    const { pair, observations: rowObservations } = await resolvePair(row)

    observations.push(...rowObservations)
    if (pair) pairs.push(pair)
  }

  const { blocked, observations: crossRowObservations } = checkCrossRow(pairs)
  observations.push(...crossRowObservations)

  const unblocked = pairs.filter(candidate => !blocked.has(candidate.rowNumber))
  const usersById = await fetchUsers(unblocked)

  const mergeable: { pair: ResolvedPair; keptUserIds: string[]; fills: Fill[] }[] = []
  for (const pair of unblocked) {
    const fills: Fill[] = []
    const sharedMembers = await findSharedMembers(pair)

    if (sharedMembers.length > 0) {
      const describeMember = (member: SharedMember) =>
        `${describeUser(member.userId, usersById)}` +
        (member.sourceEligible === member.destinationEligible
          ? ""
          : ` [eligible: source ${member.sourceEligible}, destination ${member.destinationEligible} — destination's kept]`)

      observations.push({
        ...pair,
        type: "member_kept",
        detail:
          `${sharedMembers.length} user(s) already belong to destination ${pair.destination.id}, so their ` +
          `organizations_users row on source ${pair.source.id} is left exactly as it is — repointing it would ` +
          `violate UNIQUE(organization_id, user_id), and no membership is lost by leaving it. Note the row stays ` +
          `attached to the now soft-deleted source: ${sharedMembers.map(describeMember).join(", ")}`,
        column: "organizations_users.user_id",
        sourceValue: sharedMembers.map(member => member.userId).join(", "),
        destinationValue: pair.destination.id,
      })
    }

    const fcMismatch = findFcMismatch(pair, usersById)
    if (fcMismatch) {
      const fillFc = !fcMismatch.destination.userId && fcMismatch.source.userId

      if (fillFc) fills.push({ column: "fundraisingConsultantUserId", value: fcMismatch.source.userId })

      observations.push({
        ...pair,
        type: fillFc ? "filled_from_source" : "fc_mismatch",
        detail: fillFc
          ? `organizations.fundraising_consultant_user_id: destination ${pair.destination.id} has no Fundraising ` +
            `Consultant, so the source's is taken — ${describeFc(fcMismatch.source, usersById)}. The destination ` +
            `row is updated.`
          : `Fundraising Consultant differs: source ${pair.source.id} has ${describeFc(fcMismatch.source, usersById)}, ` +
            `destination ${pair.destination.id} has ${describeFc(fcMismatch.destination, usersById)} — destination kept.`,
        column: "fundraisingConsultantUserId",
        sourceValue: fcMismatch.source.userId ? describeUser(fcMismatch.source.userId, usersById) : "none",
        destinationValue: fcMismatch.destination.userId
          ? describeUser(fcMismatch.destination.userId, usersById)
          : "none",
      })
    }

    for (const difference of findColumnDifferences(pair)) {
      const label = (value: string) =>
        difference.column === "adminUserId" && value !== "" ? describeUser(value, usersById) : value

      const sourceValue = label(difference.sourceValue)
      const destinationValue = label(difference.destinationValue)

      if (difference.type === "filled_from_source") {
        fills.push({ column: difference.column, value: pair.source[difference.column] as string | null })
      }

      const describe = () => {
        const where =
          `source ${pair.source.id} has "${sourceValue}", ` +
          `destination ${pair.destination.id} has "${destinationValue}"`

        if (difference.type === "filled_from_source") {
          return (
            `organizations.${difference.column}: destination ${pair.destination.id} has no value, so the source's ` +
            `"${sourceValue}" is taken. The destination row is updated.`
          )
        }

        if (difference.type === "case_mismatch") {
          return (
            `organizations.${difference.column}: same value, different casing — ${where} — ` +
            `destination casing kept, merge continues.`
          )
        }

        if (destinationValue === "") {
          return (
            `organizations.${difference.column}: value lost — ${where}, i.e. nothing — the source's ` +
            `value is not carried over. Merge continues.`
          )
        }

        if (sourceValue === "") {
          return `organizations.${difference.column}: ${where} — source has no value, so nothing is lost.`
        }

        return `organizations.${difference.column}: ${where} — destination value kept, merge continues.`
      }

      observations.push({
        ...pair,
        type: difference.type,
        detail: describe(),
        column: difference.column,
        sourceValue,
        destinationValue,
      })
    }

    mergeable.push({ pair, keptUserIds: sharedMembers.map(member => member.userId), fills })
  }

  console.log(
    `\n${parsed.length} data row(s) parsed, ${pairs.length} resolved to a pair, ${mergeable.length} cleared every ` +
      `pre-check, ${observations.length} observation(s).`
  )

  const results: ResultRow[] = []
  const rollback: RollbackRow[] = []

  if (args.dryRun) {
    for (const { pair, keptUserIds } of mergeable) {
      const before = await snapshotCounts(db, pair.source.id)

      results.push({
        row: pair.rowNumber,
        status: "would_merge",
        source_id: pair.source.id,
        source_name: pair.source.name ?? "",
        destination_id: pair.destination.id,
        destination_name: pair.destination.name ?? "",
        rows_to_move: totalOf(before) - keptUserIds.length,
        members_kept_on_source: keptUserIds.length,
        detail: summarizeCounts(before),
      })

      console.log(`  row ${pair.rowNumber}: ${pair.source.id} -> ${pair.destination.id}  (${summarizeCounts(before)})`)
    }

    const reportPath = await writeReport({ source, results, observations, rollback })

    console.log(`\nDry run complete, nothing written to the database.\nReport: ${reportPath}`)
    summarizeObservations(observations)

    return countBlocking(observations) > 0 ? 1 : 0
  }

  let mergedCount = 0
  let failedCount = 0

  for (const { pair, keptUserIds, fills } of mergeable) {
    const outcome = await mergePair(pair, keptUserIds, fills)

    if (outcome.status === "failed") {
      failedCount++
      observations.push({ ...pair, type: outcome.type, detail: outcome.detail })
      results.push({
        row: pair.rowNumber,
        status: "error",
        source_id: pair.source.id,
        source_name: pair.source.name ?? "",
        destination_id: pair.destination.id,
        destination_name: pair.destination.name ?? "",
        rows_moved: 0,
        members_kept_on_source: keptUserIds.length,
        detail: outcome.detail,
      })
      console.error(`  row ${pair.rowNumber}: ${pair.source.id} -> ${pair.destination.id} — ${outcome.detail}`)
      continue
    }

    mergedCount++
    const movedCounts = new Map([...outcome.moved].map(([table, ids]) => [table, ids.length]))

    for (const [table, ids] of outcome.moved) {
      for (const id of ids) {
        rollback.push({
          table,
          row_id: id,
          old_organization_id: pair.source.id,
          new_organization_id: pair.destination.id,
        })
      }
    }

    results.push({
      row: pair.rowNumber,
      status: "merged",
      source_id: pair.source.id,
      source_name: pair.source.name ?? "",
      destination_id: pair.destination.id,
      destination_name: pair.destination.name ?? "",
      rows_moved: totalOf(movedCounts),
      members_kept_on_source: keptUserIds.length,
      detail: summarizeCounts(movedCounts),
    })

    console.log(
      `  row ${pair.rowNumber}: ${pair.source.id} -> ${pair.destination.id}  (${summarizeCounts(movedCounts)})` +
        (keptUserIds.length > 0 ? `  [${keptUserIds.length} shared member(s) left on source]` : "")
    )
  }

  const reportPath = await writeReport({ source, results, observations, rollback })

  console.log(`\nMerged: ${mergedCount}  Failed: ${failedCount}  Rows repointed: ${rollback.length}`)
  summarizeObservations(observations)
  console.log(`Report: ${reportPath}`)

  return failedCount > 0 || countBlocking(observations) > 0 ? 1 : 0
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("\nError:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
