"use client"
import { env } from "@/env"

export async function validateEmailVerification(
  clerkId: string,
  ticket: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const userRes = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${clerkId}`)
    const userData = await userRes.json()
    const dbUser = userData?.data
    console.log("dbUser", dbUser)

    const sentAt = dbUser?.emailVerificationSentAt

    // No timestamp
    if (!sentAt) {
      return { valid: false, reason: "NO_TIMESTAMP" }
    }

    // Expired (24 hrs)
    const isExpired = new Date(sentAt).getTime() < Date.now() - 24 * 60 * 60 * 1000

    if (isExpired) {
      return { valid: false, reason: "EXPIRED" }
    }

    //check for latest token and match that with db
    const isConfirmMatch = dbUser.confirmEmailUrl?.includes(ticket)

    const isReportMatch = dbUser.reportEmailUrl?.includes(ticket)

    if (!isConfirmMatch && !isReportMatch) {
      return { valid: false, reason: "INVALID_LINK" }
    }

    return { valid: true, reason: "VALID" }
  } catch (_err) {
    return { valid: false, reason: "UNKNOWN_ERROR" }
  }
}
