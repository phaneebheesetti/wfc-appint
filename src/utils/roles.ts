import { ALLOWED_INVITE_ROLES_BY_ROLE, ROLES_DETAILS, RolesEnum } from "@/constants/roles"

import { firstLetterUpperCase } from "./string"

export const getRolesSelectOptions = (roles = Object.values(RolesEnum)) => {
  return roles.map(role => ({
    value: role,
    label: ROLES_DETAILS[role].label,
  }))
}

export const filterAllowedInviteRoles = (userRole: RolesEnum, roles: RolesEnum[]) => {
  const allowedRoles = ALLOWED_INVITE_ROLES_BY_ROLE[userRole]

  return roles.filter(role => allowedRoles.includes(role))
}

export const getRoleLabel = (role?: string) => {
  if (!role) return "N/A"

  if (role in ROLES_DETAILS) {
    return ROLES_DETAILS[role as RolesEnum].label
  }

  return firstLetterUpperCase(role)
}
