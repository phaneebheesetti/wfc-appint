"use client"

import { useIsClient } from "usehooks-ts"

import { EnsureClerkMetadata } from "@/components/auth/ensure-clerk-metadata"
import { TermsAndConditionsModal } from "@/components/auth/terms-and-conditions-modal"
import { Bottombar } from "@/components/ui/bottombar"
import { AppSidebar } from "@/components/ui/sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { UsersProfileModal } from "@/components/users/users-profile/users-profile-modal"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { MessagingProvider } from "@/providers/messaging-provider"

const TERMS_REQUIRED_ROLES: ReadonlyArray<RolesEnum> = [
  RolesEnum.WFC_ADMIN,
  RolesEnum.SALES_REPRESENTATIVE,
  RolesEnum.ORGANIZATION_ADMIN,
  RolesEnum.ORGANIZATION_STAFF,
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient()
  const { loggedInRole } = useLoggedInUser()

  if (!isClient) return null

  const showTermsModal =
    env.NEXT_PUBLIC_TERMS_AND_CONDITIONS_ENABLED === "true" && TERMS_REQUIRED_ROLES.includes(loggedInRole as RolesEnum)

  return (
    <MessagingProvider>
      <EnsureClerkMetadata />
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset className="md:overflow-auto max-w-screen-2xl mx-auto">
          <div className="p-4 pb-8 w-full overflow-y-auto max-h-[calc(100%-65px)] h-full md:max-h-full">{children}</div>

          <UsersProfileModal />
          {showTermsModal && <TermsAndConditionsModal />}
          <Bottombar />
        </SidebarInset>
      </SidebarProvider>
    </MessagingProvider>
  )
}
