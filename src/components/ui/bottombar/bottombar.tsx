import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarMenuButton } from "@/components/ui/sidebar"
import { type NavItem } from "@/components/ui/sidebar/app-sidebar"
import { useSidebar } from "@/components/ui/sidebar/sidebar"
import { NAVIGATION_ITEMS_BY_ROUTE, NavigationRoutesEnum } from "@/constants/navigation"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser, useMessaging } from "@/hooks"

const allNavItems: NavItem[] = [
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.DASHBOARD],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.CAMPAIGNS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PRIZES],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.PAYMENTS],
  NAVIGATION_ITEMS_BY_ROUTE[NavigationRoutesEnum.CHAT],
]

export function Bottombar() {
  const pathname = usePathname()
  const { loggedInRole, isLoading } = useLoggedInUser()
  const { toggleSidebar, isMobile } = useSidebar()
  const { hasUnreadMessages } = useMessaging()

  const navItems = allNavItems.filter(item => !item.roles || item.roles?.includes(loggedInRole ?? RolesEnum.USER))

  if (!isMobile || isLoading) return null

  return (
    <div className="flex justify-evenly items-center h-16 min-h-16 w-full border-t">
      <SidebarMenuButton
        className="size-9 justify-center cursor-pointer"
        tooltip="open menu"
        asChild
        onClick={() => toggleSidebar()}
      >
        <Menu size={16} />
      </SidebarMenuButton>

      {navItems.map(item => (
        <SidebarMenuButton
          key={item.title}
          className="size-9 justify-center"
          tooltip={item.title}
          isActive={pathname === item.url}
          asChild
        >
          <Link href={item.url}>
            {item.icon && (
              <div className="relative">
                <item.icon className="size-6" />

                {item.title === "Messages" && hasUnreadMessages && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            )}
          </Link>
        </SidebarMenuButton>
      ))}
    </div>
  )
}
