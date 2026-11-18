"use client"
import { SignInButton, useClerk, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { SignupStepEnum } from "../signup"

interface SignupInitialStepProps {
  onStepChange: (step: SignupStepEnum) => void
}

export function SignupInitialStep({ onStepChange }: SignupInitialStepProps) {
  const { signOut } = useClerk()
  const { user, isLoaded: isUserLoaded } = useUser()
  const searchParams = useSearchParams()
  const organizationId = searchParams.get("organizationId")
  const campaignId = searchParams.get("campaignId")

  useEffect(() => {
    if (!isUserLoaded) return

    if (user?.id) {
      void signOut({ redirectUrl: window.location.href })
    }
  }, [isUserLoaded])

  if (!isUserLoaded) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Skeleton className="h-8 w-48 -mb-2 mx-auto md:mx-0" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!organizationId || !campaignId) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md text-center">
        <p className="text-sm text-muted-foreground">Invalid Sign Up link, please contact support.</p>
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

        <div className="text-sm text-muted-foreground">
          If you already have an account, please{" "}
          <SignInButton>
            <span className="cursor-pointer underline">Sign In</span>
          </SignInButton>{" "}
          instead.
        </div>
      </div>

      <Button onClick={() => onStepChange(SignupStepEnum.CHILDREN_SELECTION)}>Continue</Button>
    </div>
  )
}
