"use client"

import { type LucideIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/utils/cn"

interface TabsProps {
  tabs: {
    label: string
    value: string
    content: React.ReactNode
    icon?: LucideIcon
  }[]
  defaultTab?: string
  tabsListClassName?: string
  tabsTriggerClassName?: string
}

export function TabsSimple({ tabs, defaultTab, tabsListClassName, tabsTriggerClassName }: TabsProps) {
  return (
    <Tabs className="w-full justify-start" defaultValue={defaultTab}>
      <TabsList className={cn("mb-4 justify-start", tabsListClassName)}>
        {tabs.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn("min-w-[150px] flex-1 w-full md:w-auto gap-2", tabsTriggerClassName)}
          >
            {tab.icon && <tab.icon size={16} className="min-h-4 min-w-4" />}
            {tab.label}
          </TabsTrigger>
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
