"use client"

import { useClerk } from "@clerk/nextjs"
import Image from "next/image"
import { useEffect } from "react"

import { APP_NAME } from "@/constants/app"

export function SignOutContent({ reason }: { reason?: string }) {
  const { signOut } = useClerk()

  useEffect(() => {
    void (async () => {
      try {
        await fetch("/api/role-session/clear", { method: "POST" })
      } catch {
        // best-effort
      }

      await signOut()
    })()
  }, [signOut])

  const message =
    reason === "roles_revoked" ? "All of your roles have been removed. Signing you out..." : "Signing out..."

  return (
    <div className="flex flex-col gap-4 h-screen w-full items-center justify-center animate-pulse">
      <Image src="/logo/wfc-logo.png" alt={`${APP_NAME} logo`} width={160} height={99} />

      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  )
}
