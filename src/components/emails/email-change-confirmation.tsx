"use client"

import { useClerk } from "@clerk/nextjs"
import { useSignIn } from "@clerk/nextjs/legacy"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"

import { validateEmailVerification } from "./email-validation/email-update-validation"

const AUTH_STATUS = {
  COMPLETE: "complete",
}

export default function EmailUpdateConfirmation() {
  const { isLoading, isSignedIn } = useLoggedInUser()
  const { signIn, setActive, isLoaded } = useSignIn()
  const { signOut } = useClerk()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorReason, setErrorReason] = useState<string | null>(null)
  const hasHandledFlowRef = useRef(false)
  const hasCompletedSplitRef = useRef(false)

  async function completeSplitSignIn(ticket: string) {
    try {
      if (!signIn || !setActive) {
        throw new Error("Clerk not ready")
      }
      const result = await signIn.create({
        strategy: "ticket",
        ticket,
      })
      if (result?.status === AUTH_STATUS.COMPLETE) {
        await setActive({ session: result.createdSessionId })
        setStatus("success")
      } else {
        throw new Error("Sign-in not complete")
      }
    } catch (_err) {
      setStatus("error")
      toast.error("Something went wrong")
    }
  }

  useEffect(() => {
    if (!isLoaded) return

    // A Parent row unlinking from a shared WFC Admin/FC login lands on a
    // brand-new standalone Clerk account. Completing that requires signing out of the old shared
    // session first, which navigates the browser — carried via the URL
    // rather than component state/refs so it survives that navigation even
    // if Clerk performs a hard reload rather than a client-side one.
    const splitTicket = searchParams.get("splitTicket")
    if (splitTicket) {
      if (hasCompletedSplitRef.current) return
      hasCompletedSplitRef.current = true
      void completeSplitSignIn(splitTicket)
      return
    }

    if (hasHandledFlowRef.current) return
    hasHandledFlowRef.current = true

    const clerkId = searchParams.get("clerkId") as string
    const ticket = searchParams.get("ticket") as string
    if (!clerkId || !ticket) return

    void handleFlow(clerkId, ticket)

    async function handleFlow(flowClerkId: string, flowTicket: string) {
      try {
        const validation = await validateEmailVerification(flowClerkId, flowTicket)
        if (!validation.valid) {
          setStatus("error")
          setErrorReason(validation.reason)
          return
        }
        //when not signed in
        if (!isSignedIn) {
          if (!signIn || !setActive) {
            throw new Error("Clerk not ready")
          }
          const result = await signIn.create({
            strategy: "ticket",
            ticket: flowTicket,
          })
          if (result?.status === AUTH_STATUS.COMPLETE) {
            await setActive({ session: result.createdSessionId })
          } else {
            throw new Error("Sign-in not complete")
          }
        }
        // After login → proceed with your existing logic
        await approveEmail(flowClerkId)
      } catch (_err) {
        setStatus("error")
        toast.error("Something went wrong")
      }
    }

    async function approveEmail(flowClerkId: string) {
      const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${flowClerkId}`, {
        method: "PUT",
        body: JSON.stringify({
          approveEmail: true, // triggers email address approved flow
        }),
      })
      if (!response.ok) throw new Error("Failed to update email")

      const result = (await response.json()) as { data?: { splitSignIn?: { ticket?: string } } }
      const newSplitTicket = result.data?.splitSignIn?.ticket
      if (newSplitTicket) {
        const redirectUrl = new URL(window.location.href)
        redirectUrl.searchParams.set("splitTicket", newSplitTicket)
        redirectUrl.searchParams.delete("ticket")
        // Clerk's signOut() defaults to navigating to afterSignOutUrl ("/"
        // unless configured) — without redirectUrl it would land the user on
        // the home page instead of back here to finish the split sign-in.
        await signOut({ redirectUrl: redirectUrl.toString() })
        return
      }

      setStatus("success")
    }
  }, [signIn, setActive, signOut, isSignedIn, isLoaded, searchParams])

  if (isLoading || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }
  if (status === "success")
    return (
      <div className="flex h-screen w-full">
        <div className="w-1/2 flex items-center justify-center">
          <h1 className="text-2xl font-semibold">Email updated successfully</h1>
        </div>

        <div className="hidden md:flex w-1/2 h-full flex-col items-center justify-center">
          <Image src="/wfc-logocard.jpg" alt="logo" width={420} height={197} className="w-full h-full object-cover" />
        </div>
      </div>
    )

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
}
