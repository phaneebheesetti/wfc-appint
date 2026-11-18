import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import EmailChangeReportNotification from "@/components/emails/email-change-report-notification"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  fullName: z.string(),
  role: z.string(),
  oldEmail: z.string(),
  newEmail: z.string(),
  organization: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { fullName, role, oldEmail, newEmail, organization } = body

  //Central Time (CST or CDT depending on daylight savings)
  const reportedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  })

  const html = await render(
    <EmailChangeReportNotification
      fullName={fullName}
      role={role}
      oldEmail={oldEmail}
      newEmail={newEmail}
      reportedAt={reportedAt}
      organization={organization}
    />
  )

  const result = await sendEmail({
    to: ["digitalappsupport@wfchocolate.com"], //support email
    subject: "Unauthorized Email Change Reported",
    html,
  })

  return NextResponse.json({
    message: "Report email sent",
    status: result?.[0]?.statusCode ?? 200,
  })
})
