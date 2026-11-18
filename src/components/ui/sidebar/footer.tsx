"use client"

import { useClerk } from "@clerk/nextjs"
import { Check, ChevronsUpDown, LogOut, Repeat, User } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { ROLES_DETAILS, type RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

const BROADCAST_CHANNEL_NAME = "wfc-role-switch"

export function Footer() {
  const { isMobile } = useSidebar()
  const { user, loggedInRole, availableRoles } = useLoggedInUser()
  const { signOut } = useClerk()
  const { mutateAsync: setActiveRole, isPending: isSwitchingRole } = api.users.setActiveRole.useMutation()

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    channel.onmessage = () => {
      window.location.assign("/dashboard")
    }
    return () => channel.close()
  }, [])

  if (!loggedInRole) return null

  const { icon: AvatarIcon, textColor, bgColor, label: activeRoleLabel } = ROLES_DETAILS[loggedInRole]

  const switchableRoles = (availableRoles ?? []).filter((entry): entry is { databaseId: string; role: RolesEnum } =>
    Boolean(entry?.role)
  )
  const showRoleSwitcher = switchableRoles.length > 1

  const broadcast = () => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    channel.postMessage("role-switched")
    channel.close()
  }

  const handleSwitchRole = async (role: RolesEnum) => {
    if (role === loggedInRole || isSwitchingRole) return
    try {
      await setActiveRole({ role })

      const res = await fetch("/api/role-session/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role }),
      })
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(error ?? "Failed to switch role")
      }
      await user?.reload()
      broadcast()
      window.location.assign("/dashboard")
    } catch (error) {
      toast.error((error as Error)?.message ?? "Failed to switch role")
    }
  }

  return (
    <SidebarMenu data-testid="sidebar-footer-menu">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className={cn(bgColor)}>
              <div className="-mr-0.5 hidden group-data-[collapsible=icon]:block" />

              <Avatar className={cn("flex items-center justify-center h-5 w-5 rounded-lg", textColor)}>
                <AvatarIcon />
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
                </span>
                <span className={cn("truncate text-xs flex items-center gap-1", textColor)}>
                  <AvatarIcon className="size-3" />
                  {activeRoleLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ""} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.fullName}</span>
                  <span className="truncate text-xs">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {showRoleSwitcher && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Repeat className="size-3" />
                  Switch Role
                </DropdownMenuLabel>
                {switchableRoles.map(({ databaseId, role }) => {
                  const details = ROLES_DETAILS[role]
                  if (!details) return null
                  const RoleIcon = details.icon
                  const isActive = role === loggedInRole
                  return (
                    <DropdownMenuItem
                      key={databaseId}
                      disabled={isSwitchingRole}
                      onClick={() => handleSwitchRole(role)}
                      className={cn("gap-2 cursor-pointer", isActive && "bg-accent")}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          details.bgColor,
                          details.textColor
                        )}
                      >
                        <RoleIcon className="size-4" />
                      </span>
                      <span className="flex-1 font-medium">{details.label}</span>
                      {isActive && <Check className={cn("size-4", details.textColor)} />}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                try {
                  await fetch("/api/role-session/clear", {
                    method: "POST",
                  })
                } catch {
                  // best-effort clear
                }

                await signOut()
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
