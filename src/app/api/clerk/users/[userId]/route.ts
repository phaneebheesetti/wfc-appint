import { type User, clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { createServiceClient } from "@/lib/supabase/service-client"
import { phoneType } from "@/lib/zod/types"
import { clerkIdentityMatchesSupabase } from "@/server/services/users/users-clerk-identity-match"
import { resolveClerkUserByAnyIdentifier } from "@/server/services/users/users-resolve-clerk-user"
import { usersSyncClerkRoles } from "@/server/services/users/users-sync-clerk-roles"
import { withSentry } from "@/utils/api"

const ADMIN_OR_FC_ROLES: string[] = [RolesEnum.WFC_ADMIN, RolesEnum.SALES_REPRESENTATIVE]

type LiveSiblingRow = { id: string; role: string; first_name: string | null; last_name: string | null }

// Live (not deleted, active) rows sharing this Clerk identity — used to decide
// whether an email change should propagate to every sibling (today's default),
// be rejected (a solo WFC Admin/FC trying to change their own email), or split
// off a standalone Parent identity (a Parent row with a WFC Admin/FC sibling).
async function getLiveSiblingRoles(clerkIdentity: string): Promise<LiveSiblingRow[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("users")
    .select("id, role, first_name, last_name")
    .or(clerkIdentityMatchesSupabase(clerkIdentity))
    .is("deleted_at", null)
    .eq("status", "active")
  return data ?? []
}

const bodySchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.email().optional().nullable(),
  phone: phoneType.optional().nullable(),
  approveEmail: z.boolean().optional(),
  reportEmail: z.boolean().optional(),
  databaseId: z.string().optional(),
})

export const PUT = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const userId = params.userId as string

  const body = bodySchema.parse(await req.json())
  const { firstName, lastName, email, phone } = body

  const client = await clerkClient()
  // `userId` param may be a `clerk_id` OR a `clerk_external_id` — see
  // [resolveClerkUserByAnyIdentifier].
  const user = await resolveClerkUserByAnyIdentifier(client, userId)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (phone) {
    await updatePhoneNumber(user, phone)
  }
  if (email || body.approveEmail || body.reportEmail) {
    const result = await updateEmail(user, email ?? "", body.approveEmail, body.reportEmail, body.databaseId)
    return NextResponse.json({
      data: result ?? null,
      message: "Email updated successfully",
    })
  }

  const updateData: {
    firstName?: string
    lastName?: string
  } = {}

  const finalFirstName = firstName ?? user.firstName
  const finalLastName = lastName ?? user.lastName

  if (finalFirstName !== null && finalFirstName !== undefined) {
    updateData.firstName = finalFirstName
  }
  if (finalLastName !== null && finalLastName !== undefined) {
    updateData.lastName = finalLastName
  }

  await client.users.updateUser(user.id, updateData)

  return NextResponse.json({ data: null, message: "User updated successfully" }, { status: 200 })
})

export const GET = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const userId = params.userId as string

  const client = await clerkClient()
  // `userId` param may be a `clerk_id` OR a `clerk_external_id` — see
  // [resolveClerkUserByAnyIdentifier].
  const user = await resolveClerkUserByAnyIdentifier(client, userId)

  const supabaseServiceClient = createServiceClient()

  let organizationName: string | null = null

  type EmailVerificationData = {
    id?: string
    email_verification_sent_at?: string | null
    confirm_email_url?: string | null
    report_email_url?: string | null
  }

  let dbUser: EmailVerificationData[] | null = null
  let identityRow: EmailVerificationData | null = null
  try {
    const { data, error: dbUserError } = await supabaseServiceClient
      .from("users")
      .select("id, email_verification_sent_at, confirm_email_url, report_email_url ")
      .or(clerkIdentityMatchesSupabase(userId))

    dbUser = data
    identityRow = dbUser?.[0] ?? null

    if (dbUserError) {
      console.error("Error fetching DB user:", dbUserError)
    }

    const dbUserId = identityRow?.id

    if (dbUserId) {
      //Get organization_ids
      const { data: orgUsers, error: orgUserError } = await supabaseServiceClient
        .from("organizations_users")
        .select("organization_id")
        .eq("user_id", dbUserId)

      if (orgUserError) {
        console.error("Error fetching organization_users:", orgUserError)
      }

      if (orgUsers?.length) {
        //Get organization names
        const orgIds = orgUsers.map(org => org.organization_id)

        const { data: orgs, error: orgError } = await supabaseServiceClient
          .from("organizations")
          .select("name")
          .in("id", orgIds)

        if (orgError) {
          console.error("Error fetching organizations:", orgError)
        }

        const orgNames = (orgs?.map(org => org.name) ?? []).sort((a, b) => a.localeCompare(b))

        organizationName =
          orgNames.length <= 2
            ? orgNames.join(", ")
            : `${orgNames.slice(0, 2).join(", ")}, +${orgNames.length - 2} more`
      }
    }
  } catch (err) {
    console.error("Unexpected error fetching organization:", err)
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(
    {
      data: {
        ...user,
        organization: organizationName ?? "N/A",
        emailVerificationSentAt: identityRow?.email_verification_sent_at,
        confirmEmailUrl: identityRow?.confirm_email_url,
        reportEmailUrl: identityRow?.report_email_url,
      },
    },
    { status: 200 }
  )
})

async function updatePhoneNumber(user: User, phone: string) {
  const client = await clerkClient()

  const primaryPhoneNumberId = user?.primaryPhoneNumberId

  const isNewPhoneNumber = phone !== user?.primaryPhoneNumber?.phoneNumber
  if (!isNewPhoneNumber) return

  if (primaryPhoneNumberId) {
    await client.phoneNumbers.deletePhoneNumber(primaryPhoneNumberId)
  }

  await client.phoneNumbers.createPhoneNumber({
    phoneNumber: phone,
    userId: user.id,
    verified: true,
    primary: true,
  })
}

type EmailAddressWithMeta = {
  created_at?: number
  updated_at?: number
} & User["emailAddresses"][number]

async function updateEmail(
  user: User,
  email: string,
  approveEmail?: boolean,
  reportEmail?: boolean,
  requestingDatabaseId?: string
) {
  //pending email address in clerk
  const client = await clerkClient()
  const VERIFICATION_STATUS = {
    VERIFIED: "verified",
  }
  //REPORT FLOW
  if (reportEmail) {
    const latestUser = await client.users.getUser(user.id)

    // get latest updated email in clerk
    const emailObj = (latestUser.emailAddresses as EmailAddressWithMeta[])
      .filter(e => e.verification?.status !== VERIFICATION_STATUS.VERIFIED)
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
    if (!emailObj) {
      throw new Error("Email not found in Clerk")
    }
    const newEmail = emailObj.emailAddress
    const oldPrimaryEmail = latestUser.primaryEmailAddress
    const oldEmail = oldPrimaryEmail?.emailAddress

    //delete rest of the unverified email/emails except primary
    const emailsToBeDeleted = latestUser.emailAddresses.filter(email => email.id !== latestUser.primaryEmailAddressId)
    for (const email of emailsToBeDeleted) {
      await client.emailAddresses.deleteEmailAddress(email.id)
    }

    const supabase = createServiceClient()

    await supabase
      .from("users")
      .update({
        confirm_email_url: null,
        report_email_url: null,
        email_verification_sent_at: null,
      })
      .or(clerkIdentityMatchesSupabase(user.id))

    return {
      oldEmail,
      newEmail,
    }
  }

  //Approval Flow
  if (approveEmail) {
    let latestUser = await client.users.getUser(user.id)

    // get the latest email from clerk
    const emailObj = (latestUser.emailAddresses as EmailAddressWithMeta[])
      .filter(e => e.verification?.status !== VERIFICATION_STATUS.VERIFIED)
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
    //if email not created in clerk
    if (!emailObj) {
      throw new Error("No unverified email found in Clerk")
    }

    // A Parent row sharing this Clerk identity with a WFC Admin/FC row gets a
    // different treatment: the new email must land on the Parent row only,
    // and the shared login must be split into a standalone Parent identity —
    // see splitParentIdentity(). A solo WFC Admin/FC (no Parent sibling)
    // trying to change their own email is rejected outright.
    const siblingRows = await getLiveSiblingRoles(user.id)
    const parentRow = siblingRows.find(row => row.role === RolesEnum.PARENT)
    const adminOrFcRow = siblingRows.find(row => ADMIN_OR_FC_ROLES.includes(row.role))

    if (adminOrFcRow && !parentRow) {
      throw new Error("WFC Admin / Fundraising Consultant email cannot be changed.")
    }

    if (adminOrFcRow && parentRow) {
      return splitParentIdentity({
        client,
        oldClerkUser: latestUser,
        emailObj,
        parentRow,
        adminOrFcRow,
        newEmail: emailObj.emailAddress,
      })
    }

    //mark as verified
    await client.emailAddresses.updateEmailAddress(emailObj.id, {
      verified: true, //once approved mark as verified
    })
    //Set new email as primary
    await client.users.updateUser(user.id, {
      primaryEmailAddressID: emailObj?.id,
    })
    latestUser = await client.users.getUser(user.id)
    //Delete old email & unverified emails if mutiple emails added
    const emailsToBeDeleted = latestUser.emailAddresses.filter(email => email.id !== latestUser.primaryEmailAddressId)
    for (const email of emailsToBeDeleted) {
      await client.emailAddresses.deleteEmailAddress(email.id)
    }
    const supabase = createServiceClient()

    await supabase
      .from("users")
      .update({
        confirm_email_url: null,
        report_email_url: null,
        email_verification_sent_at: null,
        email: emailObj.emailAddress, //update new email in db
      })
      .or(clerkIdentityMatchesSupabase(user.id))

    return
  }

  // WFC Admin/FC email is always locked. `user`/`email` alone can't tell us
  // WHO is asking — a WFC Admin/FC row and its linked Parent row share this
  // same Clerk identity — so when this identity has an admin/FC sibling at
  // all, only a request made while acting as the Parent row
  // (requestingDatabaseId) may proceed. Fail closed (block) if that can't be
  // confirmed, e.g. requestingDatabaseId missing or stale.
  const siblingRoles = await getLiveSiblingRoles(user.id)
  const hasAdminOrFcSibling = siblingRoles.some(row => ADMIN_OR_FC_ROLES.includes(row.role))
  if (hasAdminOrFcSibling) {
    const requestingRow = siblingRoles.find(row => row.id === requestingDatabaseId)
    if (requestingRow?.role !== RolesEnum.PARENT) {
      throw new Error("WFC Admin / Fundraising Consultant email cannot be changed.")
    }
  }

  // check if already exists
  const existingEmail = user.emailAddresses.find(e => e.emailAddress === email)

  if (existingEmail) {
    console.log("Email already exists, skipping creation")
    return
  }
  // Create new email as pending
  await client.emailAddresses.createEmailAddress({
    emailAddress: email,
    userId: user.id,
    verified: false, // pending verification
    primary: false, //until verified- mark as non primary
  })
}

// Moves a Parent row off a shared WFC Admin/FC Clerk login onto its own
// brand-new Clerk user. Clerk logins are one identity per email-set, so
// letting the Parent keep a different email than the WFC Admin/FC sibling
// requires a genuinely separate account — there's no in-place "partial
// unlink". Only the Parent row's email/clerk_id change; the WFC Admin/FC row
// (and its own email) is left untouched.
async function splitParentIdentity({
  client,
  oldClerkUser,
  emailObj,
  parentRow,
  adminOrFcRow,
  newEmail,
}: {
  client: Awaited<ReturnType<typeof clerkClient>>
  oldClerkUser: User
  emailObj: EmailAddressWithMeta
  parentRow: LiveSiblingRow
  adminOrFcRow: LiveSiblingRow
  newEmail: string
}) {
  // Free the email string — Clerk email addresses are unique across users,
  // even while unverified — before claiming it on the new account.
  await client.emailAddresses.deleteEmailAddress(emailObj.id)

  const newClerkUser = await client.users.createUser({
    firstName: parentRow.first_name ?? undefined,
    lastName: parentRow.last_name ?? undefined,
    emailAddress: [newEmail],
  })

  const supabase = createServiceClient()

  await supabase
    .from("users")
    .update({
      clerk_id: newClerkUser.id,
      clerk_external_id: null,
      email: newEmail,
      confirm_email_url: null,
      report_email_url: null,
      email_verification_sent_at: null,
    })
    .eq("id", parentRow.id)

  // The WFC Admin/FC row isn't getting the new email, but the pending-change
  // bookkeeping was shared across the identity — clear it here too.
  await supabase
    .from("users")
    .update({
      confirm_email_url: null,
      report_email_url: null,
      email_verification_sent_at: null,
    })
    .eq("id", adminOrFcRow.id)

  // Drop Parent from the old (WFC Admin/FC) identity's role list, and seed
  // the new identity's metadata with just the Parent row.
  await usersSyncClerkRoles({ clerkId: oldClerkUser.id, excludeRowIds: [parentRow.id] })
  await usersSyncClerkRoles({ clerkId: newClerkUser.id })

  // Let the caller silently re-authenticate the browser session onto the new
  // standalone account (same mechanic as the parent-onboarding magic link).
  const signInToken = await client.signInTokens.createSignInToken({
    userId: newClerkUser.id,
    expiresInSeconds: 300,
  })

  return { splitSignIn: { ticket: signInToken.token } }
}
