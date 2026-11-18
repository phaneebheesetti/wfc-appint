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

// Recipients come from the NIGHTLY_JOBS row for this job.
const EMAIL_SUBJECT = "Digital Payments Report"
const EMAIL_BODY = `Hello Team,

This is an auto-generated email.

The attached report contains the digital payments that were made through the Digital Fundraiser application for the period, {period}.`

const REPORT_SHEET_NAME = "Digital Payments"
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const HEADER_FILL_ARGB = "FFFFFF00" // yellow, matching the FC report's header row

// Must match the column aliases in the query below, in order.
const REPORT_HEADERS = ["Organization Name", "Campaign", "Status", "Amount", "Fee", "Payment From", "Payment Done on"]

const CURRENCY_HEADERS = ["Amount", "Fee"]
const CURRENCY_NUM_FMT = "$#,##0.00"

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>()
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue
    const [name, value] = arg.slice(2).split("=")
    flags.set(name!, value ?? "true")
  }

  return {
    month: flags.get("month"),
    dryRun: flags.has("dry-run"),
    force: flags.has("force"),
  }
}

type ReportRange = { start: Date; end: Date }

/** `end` is the exclusive upper bound (first instant of the month after the reported one). */
function resolveReportRange(monthOverride: string | undefined, now: Date): ReportRange {
  if (monthOverride) {
    const match = /^(\d{4})-(\d{2})$/.exec(monthOverride)
    if (!match) throw new Error(`--month must be in YYYY-MM format, got "${monthOverride}"`)

    const year = Number(match[1])
    const month = Number(match[2])
    if (month < 1 || month > 12) throw new Error(`--month must have a month between 01 and 12, got "${monthOverride}"`)

    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) }
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  return { start, end }
}

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10)

function describeRange({ start, end }: ReportRange): { label: string; period: string } {
  const lastDate = new Date(end.getTime() - 1)

  return {
    label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    period: `${formatDateOnly(start)} to ${formatDateOnly(lastDate)}`,
  }
}

async function fetchDigitalPayments({ start, end }: ReportRange) {
  return db.execute<Record<string, unknown>>(sql`
    select org.name as "Organization Name", c.name as "Campaign", case when pl.status = 'completed' then 'Succeeded' else initcap(pl.status::text) end as "Status", pl.amount_cents as "Amount", pl.fee_cents as "Fee", u.full_name as "Payment From", TO_CHAR(pl.created_at, 'MM/DD/YYYY HH24:MI:SS') as "Payment Done on"
    from payment_logs as pl join organizations as org on pl.organization_id=org.id
    join campaigns as c on pl.campaign_id = c.id
    join users as u on pl.user_id=u.id
    where pl.type = 'digital' and c.deleted_at is null
    and pl.created_at between ${start.toISOString()} and ${end.toISOString()}
    order by pl.created_at desc
  `)
}

function convertCentsToDollars(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const converted = { ...row }
    for (const header of CURRENCY_HEADERS) {
      converted[header] = Math.round(Number(converted[header])) / 100
    }

    return converted
  })
}

// Mirrors Excel's own "autofit" behavior instead of hardcoding widths tied to one sample's row content.
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

  for (const header of CURRENCY_HEADERS) {
    worksheet.getColumn(header).eachCell((cell, rowNumber) => {
      if (rowNumber > 1) cell.numFmt = CURRENCY_NUM_FMT
    })
  }

  // exceljs's type declarations shadow Node's `Buffer`; normalize the type at the boundary.
  const raw = await workbook.xlsx.writeBuffer()

  return Buffer.from(raw)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const range = resolveReportRange(args.month, new Date())
  const { label, period } = describeRange(range)

  console.log(`[digital-payments-report] Reporting period: ${period}${args.dryRun ? " (dry-run)" : ""}`)

  const jobRow = await nightlyJobsGetOrCreate({ database: db, jobName: NightlyJobNameEnum.DIGITAL_PAYMENTS_REPORT })

  if (!args.force && !args.dryRun && !isNightlyJobDue(jobRow.schedule, new Date())) {
    console.log("[digital-payments-report] Not scheduled to run today — skipping (use --force to run anyway)")

    return 0
  }

  const emailRecipients = resolveEmailRecipients(jobRow.recipients)

  try {
    const rows = convertCentsToDollars(await fetchDigitalPayments(range))
    console.log(`[digital-payments-report] Found ${rows.length} digital payment(s)`)

    const fileName = `Digital_Payments_List_${label}.xlsx`
    const contents = await buildWorkbookBuffer(rows)
    const html = EMAIL_BODY.replace("{period}", period).replace(/\n/g, "<br>")

    if (args.dryRun) {
      await fs.mkdir(DRY_RUN_OUTPUT_DIR, { recursive: true })
      const outputPath = path.join(DRY_RUN_OUTPUT_DIR, fileName)
      await fs.writeFile(outputPath, contents)
      console.log(`[digital-payments-report] Dry run — wrote ${outputPath}, no email sent`)
      console.log(
        `[digital-payments-report] Would send to: ${emailRecipients ? `${emailRecipients.to.join(", ")} (cc: ${emailRecipients.cc.join(", ")})` : "(no recipients configured)"}`
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
        emailType: "digital-payments-report",
      })

      console.log(
        `[digital-payments-report] Emailed ${fileName} to ${emailRecipients.to.join(", ")} (cc: ${emailRecipients.cc.join(", ")})`
      )
    } else {
      console.log("[digital-payments-report] Email not sent: notifications disabled or no recipients configured")
    }

    await nightlyJobsUpdate({
      database: db,
      jobName: NightlyJobNameEnum.DIGITAL_PAYMENTS_REPORT,
      completedAt: new Date(),
      status: NightlyJobStatusEnum.SUCCESS,
    })

    return 0
  } catch (error) {
    if (!args.dryRun) {
      await nightlyJobsUpdate({
        database: db,
        jobName: NightlyJobNameEnum.DIGITAL_PAYMENTS_REPORT,
        completedAt: new Date(),
        status: NightlyJobStatusEnum.FAILURE,
      }).catch((updateError: unknown) =>
        console.error("[digital-payments-report] Failed to update NIGHTLY_JOBS row:", updateError)
      )
    }

    throw error
  }
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error("[digital-payments-report] Run failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
