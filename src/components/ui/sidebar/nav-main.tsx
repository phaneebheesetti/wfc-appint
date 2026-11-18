"use client"

import { ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavigationRoutesEnum } from "@/constants/navigation"
import { useMessaging } from "@/hooks"

import { type NavItem } from "./app-sidebar"

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const { isMobile, toggleSidebar } = useSidebar()
  const { hasUnreadMessages } = useMessaging()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(item => {
          const isActive =
            (item.url as NavigationRoutesEnum) === NavigationRoutesEnum.DASHBOARD
              ? item.url === pathname
              : pathname.startsWith(item.url)

          return (
            <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
              <SidebarMenuItem>
                {item.items?.length && item.items.length > 0 ? (
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    <CollapsibleTrigger asChild>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                    <Link
                      href={item.url}
                      onClick={isMobile ? toggleSidebar : undefined}
                      target={item.openInNewTab ? "_blank" : undefined}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {item.title === "Messages" && hasUnreadMessages && (
                        <div className="absolute left-5 top-2 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      {item.openInNewTab && <ExternalLink className="ml-auto" />}
                    </Link>
                  </SidebarMenuButton>
                )}

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map(subItem => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link href={subItem.url} onClick={isMobile ? toggleSidebar : undefined}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
