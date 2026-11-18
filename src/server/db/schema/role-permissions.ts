import { integer, pgEnum, pgTable, uniqueIndex } from "drizzle-orm/pg-core"

import { type Permission, allPermissions } from "@/constants/permissions"
import { RolesEnum } from "@/constants/roles"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

export const rolesEnum = pgEnum("app_role", Object.values(RolesEnum) as [string, ...string[]])

export const permissionsEnum = pgEnum("app_permission", allPermissions as [string, ...string[]])

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    role: rolesEnum("role").notNull(),
    permission: permissionsEnum("permission").notNull(),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("role_permissions"),
    uniqueIndex("role_permission_idx").on(table.role, table.permission),
  ]
).enableRLS()

export type RolePermission = typeof rolePermissions.$inferSelect & {
  role?: RolesEnum
  permission?: Permission
}

export type RolePermissionSelect = typeof rolePermissions.$inferSelect
export type RolePermissionInsert = typeof rolePermissions.$inferInsert
