import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ContactOrganizationAdminEmail } from "@/components/emails/contact-organization-admin-email"
import { type SupabaseOrganization, type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  organizationId: z.string(),
  parentName: z.string(),
  parentEmail: z.string(),
  parentPhone: z.string().nullable(),
  childrenAttempted: z.array(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      grade: z.string(),
    })
  ),
  message: z.string(),
})

interface OrganizationWithAdmin extends SupabaseOrganization {
  users: SupabaseUser | null
}

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { organizationId, parentName, parentEmail, parentPhone, childrenAttempted, message } = body

  const supabaseServiceClient = createServiceClient()

  const { data: organization, error } = await supabaseServiceClient
    .from("organizations")
    .select(
      `
        *,
        users!organizations_admin_user_id_users_id_fk (*)
      `
    )
    .eq("id", organizationId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const organizationAdmin = (organization as OrganizationWithAdmin)?.users

  if (!organizationAdmin?.email) {
    return NextResponse.json({ error: "No organization admin found for this organization" }, { status: 404 })
  }

  const html = await render(
    <ContactOrganizationAdminEmail
      parentName={parentName}
      parentEmail={parentEmail}
      parentPhone={parentPhone}
      childrenAttempted={childrenAttempted}
      message={message}
    />
  )

  const result = await sendEmail({
    to: [organizationAdmin.email],
    subject: `Sign Up Assistance Request from ${parentName}`,
    html,
  })

  return NextResponse.json(
    {
      data: { statusCode: result[0]?.statusCode ?? 0 },
      message: "Email sent successfully",
    },
    { status: 200 }
  )
})
