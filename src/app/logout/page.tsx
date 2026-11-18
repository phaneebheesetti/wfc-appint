"use client"

import { useClerk } from "@clerk/nextjs"
import Image from "next/image"
import { useEffect } from "react"

import { APP_NAME } from "@/constants/app"

export default function LogoutPage() {
  const { signOut } = useClerk()

  useEffect(() => {
    void signOut()
  }, [signOut])

  return (
    <div className="flex flex-col gap-4 h-screen w-full items-center justify-center animate-pulse">
      <Image className="" src="/logo/wfc-logo.png" alt={`${APP_NAME} logo`} width={160} height={99} />

      <p className="text-lg text-muted-foreground">Signing out...</p>
    </div>
  )
}
