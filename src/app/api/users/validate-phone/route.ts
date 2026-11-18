import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { phoneType } from "@/lib/zod/types"
import { PhoneConflictError, usersValidatePhone } from "@/server/services/users/users-validate-phone"
import { withSentry } from "@/utils/api"

// Pre-check called by the onboarding form BEFORE Clerk's signUp.create
// consumes the invitation ticket. If the phone is taken by a different
// person, return 409 so the client toasts the message and the user can fix
// the field without the ticket being burned. The /api/accept-invitation
// route runs the same check again as defense-in-depth.
const bodySchema = z.object({
  phone: phoneType,
  databaseId: z.string().min(1),
})

export const POST = withSentry(async (req: NextRequest) => {
  const { phone, databaseId } = bodySchema.parse(await req.json())

  try {
    await usersValidatePhone({ phone, databaseId })
  } catch (err) {
    if (err instanceof PhoneConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 })
})
