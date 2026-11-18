import { create } from "zustand"

import { type Permission } from "@/constants/permissions"
import { PERMISSIONS_BY_ROLE } from "@/constants/role-permissions"
import { type RolesEnum } from "@/constants/roles"

interface ResourcePermissions {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export type PermissionsActions = {
  checkPermission: (role: RolesEnum, permission: Permission) => boolean
  getResourcePermissions: <
    T extends { SELECT: Permission; INSERT: Permission; UPDATE: Permission; DELETE: Permission },
  >(
    role: RolesEnum,
    permissionsEnum: T
  ) => ResourcePermissions
}

export type PermissionsStore = PermissionsActions

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  checkPermission: (role: RolesEnum, permission: Permission) => {
    const rolePermissions = PERMISSIONS_BY_ROLE[role]

    return rolePermissions.includes(permission)
  },

  getResourcePermissions: <
    T extends { SELECT: Permission; INSERT: Permission; UPDATE: Permission; DELETE: Permission },
  >(
    role: RolesEnum,
    permissionsEnum: T
  ) => {
    const canView = get().checkPermission(role, permissionsEnum.SELECT)
    const canCreate = get().checkPermission(role, permissionsEnum.INSERT)
    const canUpdate = get().checkPermission(role, permissionsEnum.UPDATE)
    const canDelete = get().checkPermission(role, permissionsEnum.DELETE)

    return { canView, canCreate, canUpdate, canDelete }
  },
}))
