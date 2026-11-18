import { TRPCError } from "@trpc/server"

import { ROLES_DETAILS, type RolesEnum, canRolesCombine, isMultiRoleEligible } from "@/constants/roles"
import type { db } from "@/server/db"
import { type UserInsert } from "@/server/db/schema"

import { usersCloneForRole } from "./users-clone-for-role"
import { usersCreate } from "./users-create"
import { usersGetAllByEmail } from "./users-get-all-by-email"

export const usersFindUpdateOrCreate = async ({ database, input }: { database: typeof db; input: UserInsert }) => {
  const role = input.role as RolesEnum | undefined
  if (!role) throw new TRPCError({ code: "BAD_REQUEST", message: "Role is required" })

  const rows = await usersGetAllByEmail({ input: { email: input.email } })

  if (rows.length === 0) {
    return usersCreate({ database, input })
  }

  const sameRoleRow = rows.find(r => r.role === role)
  if (sameRoleRow && !sameRoleRow.deletedAt) return sameRoleRow
  if (sameRoleRow?.deletedAt) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `This email was previously registered as ${ROLES_DETAILS[role].label} and has been removed. Use a different email.`,
    })
  }

  if (!isMultiRoleEligible(role)) {
    const existingRoleLabels = Array.from(
      new Set(
        rows
          .filter(r => !r.deletedAt)
          .map(r => ROLES_DETAILS[r.role as RolesEnum]?.label)
          .filter(Boolean)
      )
    )
    const existingDesc = existingRoleLabels.length > 0 ? existingRoleLabels.join(", ") : "another role"
    throw new TRPCError({
      code: "CONFLICT",
      message: `This email is already registered as ${existingDesc}. ${ROLES_DETAILS[role].label} must use a different email.`,
    })
  }

  const blockingLabels = Array.from(
    new Set(
      rows
        .filter(r => !r.deletedAt && !canRolesCombine(role, r.role as RolesEnum))
        .map(r => ROLES_DETAILS[r.role as RolesEnum]?.label)
        .filter(Boolean)
    )
  )
  if (blockingLabels.length > 0) {
    const blockingDesc =
      blockingLabels.length === 1
        ? blockingLabels[0]
        : `${blockingLabels.slice(0, -1).join(", ")} and ${blockingLabels[blockingLabels.length - 1]}`
    throw new TRPCError({
      code: "CONFLICT",
      message: `${input.email} is already registered as ${blockingDesc} and cannot be added as ${ROLES_DETAILS[role].label}.`,
    })
  }

  const donor = rows.find(r => !r.deletedAt) ?? rows[0]!
  return usersCloneForRole({
    database,
    input: { donor, role, invitedByUserId: input.invitedByUserId },
  })
}
