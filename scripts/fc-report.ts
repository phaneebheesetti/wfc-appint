import "dotenv/config"
import { sql } from "drizzle-orm"
import ExcelJS from "exceljs"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { NightlyJobNameEnum, NightlyJobStatusEnum } from "@/constants/nightly-jobs"
import { env } from "@/env"
import { db } from "@/server/db"
import { sendEmail } from "@/server/services/email-messaging"
import {
  isNightlyJobDue,
  nightlyJobsGetOrCreate,
  nightlyJobsUpdate,
  resolveEmailRecipients,
} from "@/server/services/nightly-jobs"

const DRY_RUN_OUTPUT_DIR = path.join(process.cwd(), "public", "reports")

// Recipients come from the NIGHTLY_JOBS row for this job. Edit the email text here.
// `{asOfDate}` in the body is replaced with the report's as-of date (YYYY-MM-DD).
const EMAIL_SUBJECT = "Fundraising Consultants Report"
const EMAIL_BODY = `Hello Team,

This is an auto-generated email.

The attached report contains all the details of Fundraising Consultants (ie... Sales Representatives) in the Digital Fundraiser application as of {asOfDate}.`

const REPORT_SHEET_NAME = "Details"
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const HEADER_FILL_ARGB = "FFFFFF00" // yellow, matching the reference template's header row

// Postgres `count(...)` returns bigint, which postgres.js returns as a string to avoid precision
// loss — coerce back to number so these render as numeric (not text) cells, matching the template.
const COUNT_HEADERS = [
  "Total Assigned Orgs",
  "Total Active Orgs",
  "Total Fundraisers",
  "Total Active Fundraisers",
  "Total Closed Fundraisers",
]

// Must match the column aliases in the query below, in order.
const REPORT_HEADERS = [
  "Name",
  "Email",
  "Account Status",
  "Created On",
  "Total Assigned Orgs",
  "Total Active Orgs",
  "Total Fundraisers",
  "Total Active Fundraisers",
  "Total Closed Fundraisers",
]

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter(arg => arg.startsWith("--")))

  return { dryRun: flags.has("--dry-run"), force: flags.has("--force") }
}

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10)

function yesterday(now: Date): Date {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000)
}

async function fetchFundraisingConsultants() {
  return db.execute<Record<string, unknown>>(sql`
    select fc.full_name as "Name", fc.email as "Email", fc.status as "Account Status", to_char(fc.created_at, 'YYYY-MM-DD') as "Created On",
    count (distinct o.id) as "Total Assigned Orgs",
    count (distinct case when c.id is not null then o.id end) as "Total Active Orgs",
    count (c.id) as "Total Fundraisers",
    count (case when c.status='active' then c.id end) as "Total Active Fundraisers",
    count (case when c.status='ended' then c.id end) as "Total Closed Fundraisers"
    from users fc
    left join (select * from organizations where deleted_at is null) o on fc.id = coalesce(o.fundraising_consultant_user_id, o.created_by_user_id)
    left join (select * from campaigns where deleted_at is null) c on o.id = c.organization_id
    where fc.role = 'sales_representative' and fc.deleted_at is null
    group by fc.full_name, fc.email, fc.status, fc.created_at
    order by fc.full_name
  `)
}

function coerceCounts(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const coerced = { ...row }
    for (const header of COUNT_HEADERS) coerced[header] = Number(coerced[header])

    return coerced
  })
}

// Mirrors Excel's own "autofit" behavior (which is what produced the column widths in the
// reference template) instead of hardcoding widths tied to one sample's row content.
function columnWidthFor(header: string, rows: Record<string, unknown>[], columnIndex: number): number {
  const key = REPORT_HEADERS[columnIndex]!
  const longest = rows.reduce((max, row) => Math.max(max, String(row[key] ?? "").length), header.length)

  return Math.min(longest + 2, 80)
}

async function buildWorkbookBuffer(rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(REPORT_SHEET_NAME)

  worksheet.columns = REPORT_HEADERS.map((header, index) => ({
    header,
    key: header,
    width: columnWidthFor(header, rows, index),
  }))

  worksheet.getRow(1).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } }
  })

  worksheet.addRows(rows)

  // exceljs's own type declarations shadow Node's `Buffer` with a bare `ArrayBuffer` stand-in, even
  // though this genuinely resolves to a Node Buffer at runtime — normalize the type at the boundary.
  const raw = await workbook.xlsx.writeBuffer()

  return Buffer.from(raw)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const asOfDate = formatDateOnly(yesterday(new Date()))

  console.log(
    `[fc-report] Reporting all current Sales Representatives, as of ${asOfDate}${args.dryRun ? " (dry-run)" : ""}`
  )

  const jobRow = await nightlyJobsGetOrCreate({ database: db, jobName: NightlyJobNameEnum.FC_REPORT })

  if (!args.force && !args.dryRun && !isNightlyJobDue(jobRow.schedule, new Date())) {
    console.log("[fc-report] Not scheduled to run today — skipping (use --force to run anyway)")

    return 0
  }

  const emailRecipients = resolveEmailRecipients(jobRow.recipients)

  try {
    const rows = coerceCounts(await fetchFundraisingConsultants())
    console.log(`[fc-report] Found ${rows.length} Sales Representative(s)`)

    const fileName = `FC-Report_${asOfDate}.xlsx`
    const contents = await buildWorkbookBuffer(rows)
    const html = EMAIL_BODY.replace("{asOfDate}", asOfDate).replace(/\n/g, "<br>")

    if (args.dryRun) {
      await fs.mkdir(DRY_RUN_OUTPUT_DIR, { recursive: true })
      const outputPath = path.join(DRY_RUN_OUTPUT_DIR, fileName)
      await fs.writeFile(outputPath, contents)
      console.log(`[fc-report] Dry run — wrote ${outputPath}, no email sent`)
      console.log(
        `[fc-report] Would send to: ${emailRecipients ? `${emailRecipients.to.join(", ")} (cc: ${emailRecipients.cc.join(", ")})` : "(no recipients configured)"}`
      )

      return 0
    }

    if (env.NIGHTLY_JOBS_EMAIL_NOTIFICATIONS_ENABLED === "true" && emailRecipients) {
      await sendEmail({
        to: emailRecipients.to,
        cc: emailRecipients.cc,
        subject: `${env.APP_ENV ? `${env.APP_ENV.toUpperCase()} -- ` : ""}${EMAIL_SUBJECT}`,
        html,
        attachments: [
          {
            content: contents.toString("base64"),
            filename: fileName,
            type: XLSX_MIME_TYPE,
            disposition: "attachment",
          },
        ],
        sendMultiple: false,
        emailType: "fc-report",
      })

      console.log(
        `[fc-report] Emailed ${fileName} to ${emailRecipients.to.join(", ")} (cc: ${emailRecipients.cc.join(", ")})`
      )
    } else {
      console.log("[fc-report] Email not sent: notifications disabled or no recipients configured")
    }

    await nightlyJobsUpdate({
      database: db,
      jobName: NightlyJobNameEnum.FC_REPORT,
      completedAt: new Date(),
      status: NightlyJobStatusEnum.SUCCESS,
    })

    return 0
  } catch (error) {
    if (!args.dryRun) {
      await nightlyJobsUpdate({
        database: db,
        jobName: NightlyJobNameEnum.FC_REPORT,
        completedAt: new Date(),
        status: NightlyJobStatusEnum.FAILURE,
      }).catch((updateError: unknown) => console.error("[fc-report] Failed to update NIGHTLY_JOBS row:", updateError))
    }

    throw error
  }
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("[fc-report] Run failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
