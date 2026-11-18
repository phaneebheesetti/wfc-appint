import { inArray } from "drizzle-orm"

import { type RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersListByRoles = async ({ database, input }: { database: typeof db; input: { roles: RolesEnum[] } }) => {
  return database.query.users.findMany({
    where: inArray(users.role, input.roles),
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  })
}
