"use client"

import Image from "next/image"

import { APP_NAME } from "@/constants/app"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"

export function DashboardWelcome({ children }: { children?: React.ReactNode }) {
  const { user } = useLoggedInUser()

  return (
    <div className="h-full w-full flex flex-col items-center justify-start gap-6 py-10">
      <Image src="/logo/wfc-logo.png" alt="logo" width={200} height={149} />

      {user?.fullName && <h1 className="text-center text-lg md:text-2xl font-medium">{user?.fullName},</h1>}

      <h2 className="text-center text-lg md:text-2xl font-normal">
        Welcome to the {APP_NAME} 🍫
        <br />
        <span className="font-semibold">Fundraising App </span> 🥳
      </h2>
      {children}
    </div>
  )
}
