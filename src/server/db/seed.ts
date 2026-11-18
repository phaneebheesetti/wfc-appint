import "dotenv/config"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { type Permission } from "@/constants/permissions"
import { PERMISSIONS_BY_ROLE } from "@/constants/role-permissions"
import { type RolesEnum } from "@/constants/roles"

import * as schema from "./schema"

const rolePermissions = Object.entries(PERMISSIONS_BY_ROLE).reduce<{ role: RolesEnum; permission: Permission }[]>(
  (acc, [role, permissions]) => {
    permissions.forEach(permission => {
      const isDuplicate = acc.some(item => String(item.role) === role && item.permission === permission)

      if (!isDuplicate) {
        acc.push({ role: role as RolesEnum, permission })
      }
    })

    return acc
  },
  []
)

async function main() {
  if (!process.env.DATABASE_MIGRATIONS_URL) {
    throw new Error("DATABASE_MIGRATIONS_URL environment variable is not set")
  }

  const conn = postgres(process.env.DATABASE_MIGRATIONS_URL, { prepare: false })
  const db = drizzle(conn, { schema })

  try {
    await db.transaction(async tx => {
      await tx.delete(schema.rolePermissions)

      await tx.insert(schema.rolePermissions).values(rolePermissions)
    })
  } finally {
    await conn.end()
  }
}

try {
  await main()
  console.log("🎉 Database seeded successfully")
  process.exit(0)
} catch (error) {
  console.error("Error seeding database:", error)
  process.exit(1)
}
