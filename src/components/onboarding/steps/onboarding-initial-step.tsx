"use client"

import { SignInButton, useClerk, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import type { ClerkRoleEntry } from "@/server/services/users/users-sync-clerk-roles"

import { OnboardingStepEnum } from "../onboarding"

interface OnboardingInitialStepProps {
  onStepChange: (step: OnboardingStepEnum) => void
}

export function OnboardingInitialStep({ onStepChange }: OnboardingInitialStepProps) {
  const { signOut } = useClerk()
  const { user, isLoaded: isUserLoaded } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("__clerk_ticket")
  const invitedRole = searchParams.get("role") as RolesEnum | null
  const databaseId = searchParams.get("databaseId")

  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isResolvingExistingAccount, setIsResolvingExistingAccount] = useState(false)
  const hasRedirectedRef = useRef(false)
  const startedForUserIdRef = useRef<string | null>(null)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!isUserLoaded || !user?.id) return
    if (hasRedirectedRef.current) return
    if (startedForUserIdRef.current === user.id) return
    startedForUserIdRef.current = user.id

    void (async () => {
      // Refresh publicMetadata so a freshly-propagated role (e.g. PARENT
      // adopted during a STAFF accept earlier in this session) is visible
      // before we decide to redirect or sign out.
      await user.reload().catch(() => undefined)

      const availableRoles = (user.publicMetadata.roles as ClerkRoleEntry[] | undefined) ?? []
      const userHasInvitedRole = !!invitedRole && availableRoles.some(entry => entry?.role === invitedRole)

      // PARENT's "Complete setup" link always lands in the parent dashboard.
      // ORG_ADMIN / ORG_STAFF intentionally re-surface the "You already have
      // an account" interstitial even for an already-signed-in user — sign
      // them out so the not-signed-in branch can render it on the next pass.
      if (userHasInvitedRole && invitedRole === RolesEnum.PARENT) {
        hasRedirectedRef.current = true
        setHasRedirected(true)
        router.replace(`/dashboard?role=${invitedRole}`)
        return
      }

      void signOut({ redirectUrl: window.location.href })
    })()
  }, [isUserLoaded, user, invitedRole, router, signOut])

  useEffect(() => {
    if (!isUserLoaded || user?.id) return
    if (!invitedRole || !databaseId) return
    if (hasRedirectedRef.current) return

    setIsResolvingExistingAccount(true)
    void (async () => {
      try {
        const res = await fetch(`/api/users/has-clerk-account?databaseId=${encodeURIComponent(databaseId)}`)
        const payload = (await res.json()) as { data?: { hasClerkAccount?: boolean } }
        if (!payload?.data?.hasClerkAccount) return

        setNeedsSignIn(true)
      } catch {
        // Best-effort detection; on failure fall through to the standard onboarding flow.
      } finally {
        setIsResolvingExistingAccount(false)
      }
    })()
  }, [isUserLoaded, user?.id, invitedRole, databaseId])

  if (!isUserLoaded || user?.id || isResolvingExistingAccount || hasRedirected) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Skeleton className="h-8 w-48 -mb-2 mx-auto md:mx-0" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (needsSignIn && invitedRole) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md text-center md:text-left">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">You already have an account</h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been added as <strong>{ROLES_DETAILS[invitedRole].label}</strong>. Sign in to continue to your{" "}
            {ROLES_DETAILS[invitedRole].label} dashboard.
          </p>
        </div>
        <SignInButton forceRedirectUrl={`/dashboard?role=${invitedRole}`}>
          <Button className="w-full">Sign in</Button>
        </SignInButton>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md text-center">
        <p className="text-sm text-muted-foreground">Invalid invitation link, please contact support.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <h2 className="text-2xl font-semibold">Welcome to Sign Up</h2>

        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms-of-service" className="underline" target="_blank" rel="noreferrer">
            Terms of Service
          </Link>{" "}
          and acknowledge that you understand the{" "}
          <Link href="/privacy-policy" className="underline" target="_blank" rel="noreferrer">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <Button onClick={() => onStepChange(OnboardingStepEnum.FORM)}>Continue</Button>
    </div>
  )
}
