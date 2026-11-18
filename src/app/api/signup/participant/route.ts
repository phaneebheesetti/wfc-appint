import { type ClerkClient } from "@clerk/backend"
import { clerkClient as createClerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import { createServiceClient } from "@/lib/supabase/service-client"
import { phoneType } from "@/lib/zod/types"
import { withSentry } from "@/utils/api"
import { capitalizeEveryWord } from "@/utils/string"

const bodySchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: phoneType.optional().nullable(),
})

type UserData = {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())

  const clerkClient = await createClerkClient()

  const createdClerkUser = await createClerkUser(clerkClient, body)
  const createdDatabaseUser = await createDatabaseUser({ ...body, clerkId: createdClerkUser.id })

  await updateClerkUserMetadata(clerkClient, {
    clerkUserId: createdClerkUser.id,
    databaseId: createdDatabaseUser.data?.id,
  })

  await sendWelcomeEmail({ email: body.email })

  const signInToken = await createSignInToken(clerkClient, { clerkUserId: createdClerkUser.id })

  return NextResponse.json(
    { data: { token: signInToken.token }, message: "User signed up successfully" },
    { status: 200 }
  )
})

const createDatabaseUser = async ({ clerkId, firstName, lastName, email, phone }: UserData & { clerkId: string }) => {
  const supabaseServiceClient = createServiceClient()

  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  return supabaseServiceClient
    .from("users")
    .insert({
      clerk_id: clerkId,
      first_name: capitalizedFirstName,
      last_name: capitalizedLastName,
      full_name: `${capitalizedFirstName} ${capitalizedLastName}`,
      email,
      phone: phone ?? null,
      status: UsersStatusEnum.ACTIVE,
      role: RolesEnum.PARTICIPANT,
    })
    .select()
    .single()
}

const createClerkUser = async (clerkClient: ClerkClient, { firstName, lastName, email, phone }: UserData) => {
  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  return clerkClient.users.createUser({
    firstName: capitalizedFirstName,
    lastName: capitalizedLastName,
    emailAddress: [email],
    phoneNumber: phone ? [phone] : undefined,
  })
}

const updateClerkUserMetadata = async (
  clerkClient: ClerkClient,
  { clerkUserId, databaseId }: { clerkUserId: string; databaseId: string }
) => {
  return clerkClient.users.updateUser(clerkUserId, {
    publicMetadata: {
      databaseId,
      role: RolesEnum.PARTICIPANT,
    },
  })
}

const createSignInToken = async (clerkClient: ClerkClient, { clerkUserId }: { clerkUserId: string }) => {
  return clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 300,
  })
}

const sendWelcomeEmail = async ({ email }: { email: string }) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome`, {
    method: "POST",
    body: JSON.stringify({
      emails: [email],
    }),
  })
}
