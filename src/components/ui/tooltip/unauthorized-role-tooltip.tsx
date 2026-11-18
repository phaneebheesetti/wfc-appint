import { cloneElement } from "react"

import { WithTooltip } from "@/components/ui/tooltip"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"

interface UnauthorizedRoleTooltipProps {
  roles: RolesEnum[]
  children: React.ReactNode
}

export function UnauthorizedRoleTooltip({ roles = [], children }: UnauthorizedRoleTooltipProps) {
  const { loggedInRole } = useLoggedInUser()

  const isAuthorized = roles.length === 0 || roles.includes(loggedInRole ?? RolesEnum.USER)

  if (isAuthorized) {
    return children
  }

  return (
    <WithTooltip
      content={
        <div className="flex flex-col gap-2">
          <strong>Unauthorized.</strong> You need to be one of the following roles:
          <ul className="list-disc list-inside">
            {roles
              ?.filter(role => role !== RolesEnum.ADMIN)
              .map(role => (
                <li key={role}>{ROLES_DETAILS[role].label}</li>
              ))}
          </ul>
        </div>
      }
      side="top"
      trigger={cloneElement(children as React.ReactElement<React.ComponentProps<"button">>, {
        disabled: true,
      })}
      tooltipTriggerClassnames="flex items-center justify-center min-w-36 flex-1 w-full md:w-auto"
    />
  )
}
