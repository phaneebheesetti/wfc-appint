import { createClerkClient } from "@clerk/backend"
import "dotenv/config"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { UsersStatusEnum } from "@/constants/users"
import * as schema from "@/server/db/schema"

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY environment variable is not set")
  }

  const emailsArg = process.argv[2]
  if (!emailsArg?.trim()) {
    throw new Error("Usage: yarn script:delete-users-by-email email1,email2,email3")
  }

  const emails = emailsArg
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (emails.length === 0) {
    throw new Error("At least one email is required")
  }

  console.log(`Processing ${emails.length} email(s): ${emails.join(", ")}`)

  const conn = postgres(process.env.DATABASE_URL, { prepare: false })
  const db = drizzle(conn, { schema })
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const updatedDbUsers = await db
    .update(schema.users)
    .set({ deletedAt: new Date(), status: UsersStatusEnum.DELETED })
    .where(
      sql`lower(${schema.users.email}) in (${sql.join(
        emails.map(e => sql`${e}`),
        sql`, `
      )})`
    )
    .returning({ id: schema.users.id, email: schema.users.email })

  console.log(`Database: soft-deleted ${updatedDbUsers.length} user(s)`)
  for (const u of updatedDbUsers) {
    console.log(`  - ${u.email} (id: ${u.id})`)
  }

  const { data: clerkUsers = [] } = await clerkClient.users.getUserList({
    emailAddress: emails,
  })
  await Promise.all(clerkUsers.map(clerkUser => clerkClient.users.deleteUser(clerkUser.id)))

  console.log(`Clerk: deleted ${clerkUsers.length} user(s)`)
  for (const u of clerkUsers) {
    console.log(`  - ${u.emailAddresses?.[0]?.emailAddress} (id: ${u.id})`)
  }

  console.log("\nDone.")
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error("\nError:", error)
  process.exit(1)
}
