import type { db } from "@/server/db"
import { type OrganizationInsert, type OrganizationSelect } from "@/server/db/schema"

import { organizationsCreate } from "./organizations-create"

export type OrganizationsBulkResult =
  | { status: "ok"; organization: OrganizationSelect }
  | { status: "error"; message: string }

export const organizationsCreateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: OrganizationInsert[]
}): Promise<OrganizationsBulkResult[]> => {
  if (input.length === 0) return []

  const settled = await Promise.allSettled(
    input.map(organizationInput => organizationsCreate({ database, input: organizationInput }))
  )

  return settled.map(result => {
    if (result.status === "rejected") {
      return {
        status: "error",
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }
    }

    if (!result.value) return { status: "error", message: "Organization was not created" }

    return { status: "ok", organization: result.value }
  })
}
