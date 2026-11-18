import { inArray, sql } from "drizzle-orm"

import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { type UserSelect, users } from "@/server/db/schema"

const ASSIGNABLE_FC_STATUSES: string[] = [UsersStatusEnum.ACTIVE, UsersStatusEnum.PENDING]

export type OrganizationsFCResolution = { status: "ok"; user: UserSelect } | { status: "error"; message: string }

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const labelFor = (role: string) => ROLES_DETAILS[role as RolesEnum]?.label ?? role

const resolveOne = (rows: UserSelect[]): OrganizationsFCResolution => {
  if (rows.length === 0) return { status: "error", message: "No user found with this email" }

  const liveRows = rows.filter(row => !row.deletedAt)
  const consultantRows = liveRows.filter(row => row.role === RolesEnum.SALES_REPRESENTATIVE)

  if (consultantRows.length === 0) {
    const otherLabels = Array.from(new Set(liveRows.map(row => labelFor(row.role))))

    return {
      status: "error",
      message: otherLabels.length
        ? `Registered as ${otherLabels.join(", ")}, not a Fundraising Consultant`
        : "Fundraising Consultant account was removed",
    }
  }

  const assignableRows = consultantRows
    .filter(row => ASSIGNABLE_FC_STATUSES.includes(row.status ?? ""))
    .sort(
      (first, second) =>
        Number(second.status === UsersStatusEnum.ACTIVE) - Number(first.status === UsersStatusEnum.ACTIVE)
    )

  const [user] = assignableRows
  if (!user) {
    const statuses = Array.from(new Set(consultantRows.map(row => row.status ?? "unknown")))

    return {
      status: "error",
      message: `Fundraising Consultant account is ${statuses.join(", ")} — must be active or pending`,
    }
  }

  return { status: "ok", user }
}

export const organizationsResolveFCsByEmail = async ({
  database,
  input,
}: {
  database: typeof db
  input: { emails: string[] }
}): Promise<Map<string, OrganizationsFCResolution>> => {
  const resolutionsByEmail = new Map<string, OrganizationsFCResolution>()

  const uniqueEmails = Array.from(new Set(input.emails.map(normalizeEmail).filter(Boolean)))
  if (uniqueEmails.length === 0) return resolutionsByEmail

  const rows = await database.query.users.findMany({
    where: inArray(sql`lower(${users.email})`, uniqueEmails),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })

  const rowsByEmail = new Map<string, UserSelect[]>()
  for (const row of rows) {
    const key = normalizeEmail(row.email ?? "")
    if (!key) continue

    rowsByEmail.set(key, [...(rowsByEmail.get(key) ?? []), row])
  }

  for (const email of uniqueEmails) {
    resolutionsByEmail.set(email, resolveOne(rowsByEmail.get(email) ?? []))
  }

  return resolutionsByEmail
}
