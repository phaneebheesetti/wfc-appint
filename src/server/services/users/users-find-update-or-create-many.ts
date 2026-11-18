import type { db } from "@/server/db"
import { type UserInsert } from "@/server/db/schema"

import { type UsersBulkResult } from "./users-bulk-result"
import { usersFindUpdateOrCreate } from "./users-find-update-or-create"

export const usersFindUpdateOrCreateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: UserInsert[]
}): Promise<UsersBulkResult[]> => {
  if (input.length === 0) return []

  const settled = await Promise.allSettled(
    input.map(async item => ({ item, user: await usersFindUpdateOrCreate({ database, input: item }) }))
  )

  return settled.map((result, index): UsersBulkResult => {
    if (result.status === "fulfilled" && result.value.user) {
      return { status: "ok", user: result.value.user }
    }
    const item = input[index]
    const message =
      result.status === "rejected"
        ? result.reason instanceof Error
          ? result.reason.message
          : "Unknown error"
        : "User not created"
    return { status: "error", email: item?.email ?? null, phone: item?.phone ?? null, message }
  })
}
