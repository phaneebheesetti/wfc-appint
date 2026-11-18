"use client"

import { type LucideIcon } from "lucide-react"
import { useMemo } from "react"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { NAVIGATION_ITEMS_BY_ROUTE, NavigationRoutesEnum } from "@/constants/navigation"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"

import { Footer } from "./footer"
import { Header } from "./header"
import { NavCampaigns } from "./nav-campaigns"
import { NavMain } from "./nav-main"

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    items?: {
      title: string
      url: string
      disabled?: boolean
    }[]
  }[]
  roles?: RolesEnum[]
  openInNewTab?: boolean
}

const mainNavItems: NavItem[] = [
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.DASHBOARD],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.USERS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.ORGANIZATIONS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.CAMPAIGNS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PRIZES],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PAYMENTS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.DOCUMENTS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.INVENTORY],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.CHAT],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PAYMENT_PORTAL],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.DOCUMENTATION],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PERMISSIONS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.EMAIL_TEMPLATES],
]

export function AppSidebar() {
  const { loggedInRole, loggedInUserId, isLoading } = useLoggedInUser()
  const { isMobile } = useSidebar()

  const filteredMainNavItems = useMemo(() => {
    const navItems = [...mainNavItems]

    const filteredNavItems = navItems.filter(item =>
      item.roles ? item.roles.includes(loggedInRole ?? RolesEnum.USER) : true
    )

    return filteredNavItems.map(item =>
      item.url === "/payment" && loggedInRole === RolesEnum.PARENT && loggedInUserId
        ? {
            ...item,
            url: `${item.url}?parentId=${encodeURIComponent(loggedInUserId)}`,
          }
        : item
    )
  }, [loggedInRole, loggedInUserId])

  if (!isMobile && isLoading)
    return (
      <div className="h-full w-56">
        <Skeleton className="flex h-full w-56 flex-col justify-between bg-sidebar p-4">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-32 mb-4" />

            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`sidebar-skeleton-${index}`} className="h-6 w-full" />
            ))}
          </div>

          <Skeleton className="h-10 w-full" />
        </Skeleton>
      </div>
    )

  const showNavCampaigns = ![RolesEnum.PARENT, RolesEnum.PARTICIPANT].includes(loggedInRole ?? RolesEnum.USER)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center">
        <Header />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain items={filteredMainNavItems} />
        {showNavCampaigns && <NavCampaigns />}
      </SidebarContent>
      <SidebarFooter>
        <Footer />
      </SidebarFooter>
    </Sidebar>
  )
}
