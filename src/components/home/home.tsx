"use client"

import { SignInButton } from "@clerk/nextjs"
import * as Sentry from "@sentry/nextjs"
import { AlertCircle, House, LogIn, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"

export function Home() {
  const { isLoading, isSignedIn, loggedInRole, loggedInUserId, loggedInClerkId } = useLoggedInUser()

  useEffect(() => {
    if (isLoading) return

    if (!loggedInRole || !loggedInUserId) {
      Sentry.captureException(
        new Error(
          `User is not signed in. Clerk ID: ${loggedInClerkId}, Role: ${loggedInRole}, UserId: ${loggedInUserId}`
        )
      )
    }
  }, [isLoading, loggedInRole, loggedInUserId, loggedInClerkId])

  if (isLoading) return <Button className="w-40 h-10">Loading...</Button>

  if (!isSignedIn)
    return (
      <SignInButton>
        <div
          className="flex items-center justify-center gap-2 w-40 h-10 px-4 py-2 rounded-md border border-input bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-sm font-medium"
          data-testid="home-sign-in"
        >
          <LogIn size={16} /> Sign in
        </div>
      </SignInButton>
    )

  if (!loggedInRole || !loggedInUserId) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center">
        <Link href="/logout">
          <Button className="w-40 h-10">
            <LogOut /> Sign out
          </Button>
        </Link>

        {(!loggedInRole || !loggedInUserId) && (
          <div className="flex flex-col items-center text-medium text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} /> Sorry, there is an error with your account.
            </div>
            <div className="flex items-center gap-2">Try clicking the sign out button and signing in again later.</div>
            <div className="flex items-center text-center gap-2">If the problem persists, please contact support.</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link href="/dashboard" data-testid="home-go-to-dashboard">
      <Button className="w-40 h-10">
        <House /> Go to Dashboard
      </Button>
    </Link>
  )
}
