"use client"

import { Building, ChevronRight, Megaphone } from "lucide-react"
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
  SidebarMenuSubSubItem,
} from "@/components/ui/sidebar"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { type NavItem } from "./app-sidebar"

export function NavCampaigns() {
  const pathname = usePathname()
  const { loggedInUserId = "", loggedInRole } = useLoggedInUser()

  const { data: organizationsWithCampaigns = [], isLoading: isLoadingCampaigns } =
    api.campaigns.getAllFromUserId.useQuery(
      { userId: loggedInUserId, role: loggedInRole },
      { enabled: !!loggedInUserId }
    )

  if (isLoadingCampaigns) return null

  const subItems = organizationsWithCampaigns.map(organization => {
    const filteredCampaigns =
      organization.campaigns
        ?.filter(campaign => !campaign.deletedAt)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return timeB - timeA
        }) ?? []

    return {
      title: organization.name ?? "Organization",
      url: `/dashboard/organizations/${organization.id}`,
      icon: Building,
      items:
        filteredCampaigns?.length > 0
          ? filteredCampaigns?.map(campaign => ({
              title: campaign.name ?? "Fundraiser",
              url: `/dashboard/organizations/${organization.id}/campaigns/${campaign.id}`,
              icon: Megaphone,
            }))
          : [
              {
                title: "No fundraisers yet",
                url: "#",
                icon: Megaphone,
                disabled: true,
              },
            ],
    }
  })

  const items: NavItem[] = [
    {
      title: "Fundraisers",
      url: "",
      icon: Megaphone,
      items: subItems,
    },
  ]

  if (subItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(item => {
          return (
            <Collapsible key={item.title} asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                {item.items?.length && item.items.length > 0 ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                      <>
                        {item.icon && <item.icon />}
                        <span className="capitalize">{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span className="capitalize">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((item, index) => (
                      <SidebarMenuSubItem key={item.title + index}>
                        <Collapsible asChild defaultOpen>
                          <div className="group/subcollapsible">
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubSubItem className="flex items-center">
                                <SidebarMenuSubButton asChild className="w-full">
                                  <Link href={item.url}>
                                    {item.icon && <item.icon />}
                                    <span className="font-medium truncate capitalize">{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                <SidebarMenuSubButton className="cursor-pointer pr-3">
                                  <ChevronRight className="transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                                </SidebarMenuSubButton>
                              </SidebarMenuSubSubItem>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items?.map(subsubItem => (
                                  <SidebarMenuSubItem key={subsubItem.title} className="relative">
                                    <div className="bg-border h-px w-2 absolute -left-2.5 top-1/2 -translate-y-1/2 text-border" />

                                    <SidebarMenuSubButton asChild>
                                      {subsubItem.disabled ? (
                                        <span className="!text-muted-foreground/75 capitalize pointer-events-none">
                                          {subsubItem.title}
                                        </span>
                                      ) : (
                                        <Link href={subsubItem.url}>
                                          <span className="capitalize">{subsubItem.title}</span>
                                        </Link>
                                      )}
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
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
