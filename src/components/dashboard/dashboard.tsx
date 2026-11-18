"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { DashboardCampaigns } from "@/components/dashboard/dashboard-campaigns"
// import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome"
import { ParentDashboard } from "@/components/parent/parent-dashboard"
import { ParticipantDashboard } from "@/components/participant/participant-dashboard"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"

import { DashboardOrgAdminWelcomeExp } from "./dashboard-org-admin/dashboard-orgadmin-welcome-exp"
import { DashboardSalesRep } from "./dashboard-sales-rep"

export function Dashboard() {
  const { user, loggedInRole: role, loggedInUserId: userId, availableRoles } = useLoggedInUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestedRole = searchParams.get("role") as RolesEnum | null
  const reboundFromRole = searchParams.get("role_rebound") as RolesEnum | null
  const { mutateAsync: setActiveRole } = api.users.setActiveRole.useMutation()
  const hasSwitchedRef = useRef(false)
  const hasShownReboundToastRef = useRef(false)

  useEffect(() => {
    if (hasSwitchedRef.current) return
    if (!requestedRole || !role) return
    if (requestedRole === role) {
      hasSwitchedRef.current = true
      router.replace("/dashboard")
      return
    }
    const canSwitch = (availableRoles ?? []).some(entry => entry?.role === requestedRole)
    if (!canSwitch) {
      hasSwitchedRef.current = true
      router.replace("/dashboard")
      return
    }
    hasSwitchedRef.current = true
    void (async () => {
      await setActiveRole({ role: requestedRole })
      await user?.reload()
      router.replace("/dashboard")
    })()
  }, [requestedRole, role, availableRoles, setActiveRole, user, router])

  useEffect(() => {
    if (hasShownReboundToastRef.current) return
    if (!reboundFromRole || !role) return
    hasShownReboundToastRef.current = true
    const previousLabel = ROLES_DETAILS[reboundFromRole]?.label ?? reboundFromRole
    const currentLabel = ROLES_DETAILS[role]?.label ?? role
    toast.info(`Your "${previousLabel}" role was removed. Switched to "${currentLabel}".`)
    router.replace("/dashboard")
  }, [reboundFromRole, role, router])

  if (!role) return null

  if ([RolesEnum.SALES_MANAGER, RolesEnum.ORGANIZATION_STAFF].includes(role)) {
    return <DashboardCampaigns />
  }

  if (role === RolesEnum.SALES_REPRESENTATIVE) {
    return <DashboardSalesRep />
  }

  if (role === RolesEnum.ORGANIZATION_ADMIN) {
    return <DashboardOrgAdminWelcomeExp />
  }

  if (role === RolesEnum.PARTICIPANT) {
    return <ParticipantDashboard userId={userId!} />
  }

  if (role === RolesEnum.PARENT) {
    return <ParentDashboard />
  }

  // if ([RolesEnum.ADMIN, RolesEnum.WFC_ADMIN].includes(role)) {
  //   return <DashboardMetrics />
  // }

  return <DashboardWelcome />
}
