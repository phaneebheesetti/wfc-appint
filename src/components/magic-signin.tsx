"use client"

import { useAuth, useClerk, useUser } from "@clerk/nextjs"
import { useSignIn } from "@clerk/nextjs/legacy"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { APP_NAME } from "@/constants/app"

export function MagicSignIn() {
  const hasStartedSignOutRef = useRef(false)
  const { signOut } = useClerk()
  const { isSignedIn, isLoaded: isAuthLoaded, userId } = useAuth()
  const { user } = useUser()
  const { signIn, setActive, isLoaded } = useSignIn()
  const searchParams = useSearchParams()
  const router = useRouter()
  const hasRunRef = useRef(false)

  useEffect(() => {
    const handleAuthSwap = async () => {
      if (!isAuthLoaded || !isLoaded) return

      if (hasRunRef.current) return
      hasRunRef.current = true

      const ticket = searchParams.get("ticket")
      const requestedRole = searchParams.get("role")
      const dashboardTarget = requestedRole ? `/dashboard?role=${requestedRole}` : "/dashboard"

      if (!ticket) {
        router.push(dashboardTarget)
        return
      }

      const clerkId = searchParams.get("clerkId")
      if (isSignedIn && userId && clerkId && userId === clerkId) {
        await user?.reload()
        router.push(dashboardTarget)
        return
      }

      if (isSignedIn) {
        if (hasStartedSignOutRef.current) {
          // Pass 2: already signed out; fall through to sign-in
        } else {
          hasStartedSignOutRef.current = true
          await signOut()
          return
        }
      }

      try {
        const res = await signIn.create({
          strategy: "ticket",
          ticket,
        })

        if (res.status === "complete" && res.createdSessionId) {
          await setActive({ session: res.createdSessionId })
          router.push(dashboardTarget)
        } else {
          router.push(dashboardTarget)
        }
      } catch (err) {
        console.error("Magic link failed", err)
        router.push(dashboardTarget)
      }
    }

    void handleAuthSwap()
  }, [isSignedIn, isAuthLoaded, isLoaded, signOut, signIn, setActive, searchParams, router, user, userId])

  return (
    <div className="flex flex-col gap-4 h-screen w-full items-center justify-center animate-pulse">
      <Image className="" src="/logo/wfc-logo.png" alt={`${APP_NAME} logo`} width={160} height={99} />

      <p className="text-lg text-muted-foreground">Signing in...</p>
    </div>
  )
}
