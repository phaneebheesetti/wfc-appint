import { eq, inArray } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type UserSelect, users } from "@/server/db/schema"
import { chunkArray } from "@/utils/array"

const CONCURRENCY_BATCH_SIZE = 15

const getResponseErrorReason = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: string }
    return data?.error ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export type UsersResendInvitationManyFailure = { email: string; reason: string }

export const usersResendInvitationMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userIds: string[] }
}) => {
  const { userIds } = input
  if (userIds.length === 0) return { sentCount: 0, failedCount: 0, failed: [] as UsersResendInvitationManyFailure[] }

  const rows = await database.query.users.findMany({
    where: inArray(users.id, userIds),
  })

  const eligibleRows = rows.filter(
    (row): row is UserSelect & { email: string } =>
      row.role === RolesEnum.PARENT &&
      !!row.email &&
      (row.status === UsersStatusEnum.ACTIVE || row.status === UsersStatusEnum.PENDING)
  )

  const failed: UsersResendInvitationManyFailure[] = []
  let sentCount = 0

  for (const batch of chunkArray(eligibleRows, CONCURRENCY_BATCH_SIZE)) {
    const results = await Promise.allSettled(batch.map(row => resendInvitationForUser({ database, user: row })))

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sentCount++
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : "Unknown error"
        failed.push({ email: batch[index]!.email, reason })
      }
    })
  }

  return { sentCount, failedCount: failed.length, failed }
}

// Clerk returns this when userId doesn't resolve to a real Clerk user
const isClerkUserNotFoundError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes("Not Found")

const resendInvitationForUser = async ({
  database,
  user,
}: {
  database: typeof db
  user: UserSelect & { email: string }
}) => {
  if (user.clerkId) {
    try {
      await sendWelcomeParentEmailForExistingUser({ email: user.email, clerkId: user.clerkId })
      await database.update(users).set({ lastInviteSentAt: new Date() }).where(eq(users.id, user.id))
      return
    } catch (error) {
      if (!isClerkUserNotFoundError(error)) throw error

      await database.update(users).set({ clerkId: null }).where(eq(users.id, user.id))
    }
  }

  const invitationUrl = await sendClerkInvite(user)

  await sendWelcomeParentEmailForFreshInvite({ email: user.email, invitationUrl })

  await database
    .update(users)
    .set({ clerkInvitationUrl: invitationUrl, clerkInvitationSentAt: new Date(), lastInviteSentAt: new Date() })
    .where(eq(users.id, user.id))
}

const sendClerkInvite = async (user: UserSelect & { email: string }): Promise<string> => {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/invite`, {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      databaseId: user.id,
      notify: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create Clerk invitation for ${user.email}: ${await getResponseErrorReason(response)}`)
  }

  const data = (await response.json()) as { data?: { url?: string } }
  if (!data?.data?.url) throw new Error(`Clerk invitation for ${user.email} returned no url`)

  return data.data.url
}

const sendWelcomeParentEmailForFreshInvite = async ({
  email,
  invitationUrl,
}: {
  email: string
  invitationUrl: string
}) => {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, invitationUrl }),
  })
  if (!response.ok) {
    throw new Error(`Failed to send welcome-parent email to ${email}: ${await getResponseErrorReason(response)}`)
  }
}

const sendWelcomeParentEmailForExistingUser = async ({ email, clerkId }: { email: string; clerkId: string }) => {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, clerkId }),
  })
  if (!response.ok) {
    throw new Error(`Failed to send welcome-parent email to ${email}: ${await getResponseErrorReason(response)}`)
  }
}
