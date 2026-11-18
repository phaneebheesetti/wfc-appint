"use client"

import Image from "next/image"
import Link from "next/link"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

export function Header() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/dashboard">
          <SidebarMenuButton size="xl" className="w-full flex justify-center p-0">
            <div
              className={
                isCollapsed
                  ? "flex items-center justify-center p-0 bg-transparent border-0"
                  : "bg-white p-2 border rounded-xl flex items-center justify-center"
              }
            >
              <Image
                src={isCollapsed ? "/logo/logo.png" : "/logo/wfc-logo.png"}
                alt="logo"
                width={isCollapsed ? 32 : 190}
                height={45}
                className="object-contain"
              />
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
