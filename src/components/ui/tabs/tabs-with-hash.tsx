"use client"

import { type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UnauthorizedRoleTooltip } from "@/components/ui/tooltip/unauthorized-role-tooltip"
import { type RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { cn } from "@/utils/cn"

export interface Tab {
  label: string
  value: string
  content: React.ReactNode
  icon?: LucideIcon
  roles?: RolesEnum[]
}

interface TabsProps {
  tabs: Tab[]
  tabsListClassName?: string
}

export function TabsWithHash({ tabs, tabsListClassName }: TabsProps) {
  const { isLoading } = useLoggedInUser()
  const [activeTab, setActiveTab] = useState("")

  // Set active tab based on URL hash on component mount and when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")

      if (tabs.some(tab => tab.value === hash)) {
        setActiveTab(hash)
      } else {
        setActiveTab(tabs?.[0]?.value ?? "")
      }
    }

    // Initial check
    if (!isLoading) {
      handleHashChange()
    }

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [isLoading])

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    window.location.hash = value
  }

  if (isLoading) {
    return (
      <Skeleton className="flex items-center gap-2 p-1 rounded-md w-full h-full flex-col md:flex-row">
        {Array.from({ length: tabs.length ?? 3 }).map((_, index) => (
          <Skeleton key={index} className="min-w-[150px] flex-1 w-full md:w-auto rounded-lg bg-white min-h-8" />
        ))}
      </Skeleton>
    )
  }

  if (!activeTab) {
    return null
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full justify-start">
      <TabsList className={cn("mb-4 justify-start bg-white", tabsListClassName)}>
        {tabs.map(tab => (
          <UnauthorizedRoleTooltip key={tab.value} roles={tab.roles ?? []}>
            <TabsTrigger key={tab.value} value={tab.value} className="min-w-[150px] flex-1 w-full md:w-auto gap-2">
              <>
                {tab.icon && <tab.icon size={16} className="min-h-4 min-w-4" />}
                {tab.label}
              </>
            </TabsTrigger>
          </UnauthorizedRoleTooltip>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
