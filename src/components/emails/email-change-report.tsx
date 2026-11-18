"use client"

import { useSignIn } from "@clerk/nextjs/legacy"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { getRoleLabel } from "@/utils/roles"

import { validateEmailVerification } from "./email-validation/email-update-validation"

export default function EmailUpdateReport() {
  const { isLoading, isSignedIn } = useLoggedInUser()
  const { signIn, setActive, isLoaded } = useSignIn()
  const searchParams = useSearchParams()
  const hasRunRef = useRef(false)
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorReason, setErrorReason] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (hasRunRef.current) return
    hasRunRef.current = true
    const clerkId = searchParams.get("clerkId") as string
    const ticket = searchParams.get("ticket") as string
    const AUTH_STATUS = {
      COMPLETE: "complete",
    }
    if (!clerkId || !ticket) return

    async function handleFlow() {
      try {
        const validation = await validateEmailVerification(clerkId, ticket)
        if (!validation.valid) {
          setErrorReason(validation.reason)
          setStatus("error")
          return
        }
        //when not signed in
        if (!isSignedIn) {
          if (!signIn || !setActive) {
            throw new Error("Clerk not ready")
          }
          const result = await signIn?.create({
            strategy: "ticket",
            ticket: ticket,
          })
          if (result?.status === AUTH_STATUS.COMPLETE) {
            await setActive({ session: result.createdSessionId })
          } else {
            throw new Error("Sign-in not complete")
          }
        }
        // After login → proceed with your existing logic
        await reportEmail()
      } catch (_err) {
        setStatus("error")
        toast.error("Something went wrong")
      }
    }

    async function reportEmail() {
      try {
        //delete email in clerk
        const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${clerkId}`, {
          method: "PUT",
          body: JSON.stringify({
            reportEmail: true,
          }),
        })

        if (!response.ok) throw new Error("Failed to report email")
        const result = await response.json()
        const oldEmail = result.data?.oldEmail
        const newEmail = result.data?.newEmail

        //get user details
        const userRes = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${clerkId}`)
        const userData = await userRes.json()

        const user = userData?.data

        const organization = user?.organization
        const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`
        const unformattedRole = user?.publicMetadata?.role
        const role = getRoleLabel(unformattedRole)
        //send support email
        await fetch("/api/email/send/email-change-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            role,
            oldEmail,
            newEmail,
            organization,
          }),
        })

        setStatus("success")
      } catch (_err) {
        setStatus("error")
        toast.error("Something went wrong")
      }
    }

    handleFlow()
  }, [searchParams, isSignedIn, isLoaded, setActive])

  if (isLoading || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex h-screen w-full">
        <div className="w-1/2 flex items-center justify-center">
          <h1 className="text-2xl font-semibold text-center px-6">
            We have reported the issue and have secured your account.
            <br />
            <br />
            Your email address has been reverted to your previous email, and no changes have been made.
          </h1>
        </div>

        <div className="hidden md:flex w-1/2 h-full flex-col items-center justify-center">
          <Image src="/wfc-logocard.jpg" alt="logo" width={420} height={197} className="w-full h-full object-cover" />
        </div>
      </div>
    )
  }

  if (status === "error") {
    const message =
      errorReason === "INVALID_LINK"
        ? "This email verification link is no longer valid because a newer email update request was submitted for your account. \n\nPlease use the latest verification email sent to your inbox or initiate a new email update request."
        : "This link has already been used or has expired.\n\nIf you still need to update your email address, please go to your Profile settings and initiate the request again."

    return (
      <div className="flex h-screen w-full">
        <div className="w-1/2 flex items-center justify-center px-6">
          <h1 className="text-2xl font-semibold text-center whitespace-pre-line">{message}</h1>
        </div>

        <div className="hidden md:flex w-1/2 h-full flex-col items-center justify-center">
          <Image src="/wfc-logocard.jpg" alt="logo" width={420} height={197} className="w-full h-full object-cover" />
        </div>
      </div>
    )
  }
  return null
}
