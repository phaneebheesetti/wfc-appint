"use client"

import { useState } from "react"

import { type Permission, allPermissions } from "@/constants/permissions"
import { PERMISSIONS_BY_ROLE } from "@/constants/role-permissions"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"

export function PermissionsList() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredCol, setHoveredCol] = useState<string | null>(null)

  const filteredPermissions: Partial<typeof PERMISSIONS_BY_ROLE> = { ...PERMISSIONS_BY_ROLE }
  delete filteredPermissions[RolesEnum.USER]
  delete filteredPermissions[RolesEnum.ADMIN]

  // Sort the permissions alphabetically
  const sortedPermissions = [...allPermissions]
    .filter(permission => !permission.startsWith("participants.") && !permission.startsWith("campaigns_participants."))
    .sort()

  const sortedRoles = [
    RolesEnum.WFC_ADMIN,
    RolesEnum.SALES_MANAGER,
    RolesEnum.SALES_REPRESENTATIVE,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
  ]

  return (
    <div className="overflow-x-auto max-h-[85vh] relative border">
      <table className="min-w-full bg-white border border-collapse">
        <thead className="sticky top-0 bg-white shadow-elev-1">
          <tr>
            <th className="border p-2 sticky left-0 bg-white">Permission</th>
            {sortedRoles.map(role => (
              <th
                key={role}
                className={`border p-2 ${hoveredCol === role ? "bg-gray-100" : ""}`}
                onMouseEnter={() => setHoveredCol(role)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {ROLES_DETAILS[role].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedPermissions.map(permission => (
            <tr
              key={permission}
              onMouseEnter={() => setHoveredRow(permission)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className={`border p-2 ${hoveredRow === permission ? "bg-gray-100" : ""}`}>{permission}</td>

              {sortedRoles.map(role => (
                <td
                  key={role}
                  className={`border p-2 text-center ${
                    hoveredRow === permission && hoveredCol === role
                      ? "bg-blue-100"
                      : hoveredRow === permission || hoveredCol === role
                        ? "bg-gray-100"
                        : ""
                  }`}
                  onMouseEnter={() => {
                    setHoveredRow(permission)
                    setHoveredCol(role)
                  }}
                  onMouseLeave={() => {
                    setHoveredRow(null)
                    setHoveredCol(null)
                  }}
                >
                  {filteredPermissions[role]?.includes(permission as Permission) ? "✓" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
