import { type User, createClerkClient } from "@clerk/backend"
import "dotenv/config"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { UsersStatusEnum } from "@/constants/users"
import * as schema from "@/server/db/schema"

const INACTIVITY_THRESHOLD_DAYS = 14

const WHITELISTED_EMAILS = new Set([
  "pinheiro@ae.studio",
  "lucaspinheiroifsul@gmail.com",
  "riteeka@ae.studio",
  "kjivani@wfchocolate.com",
  "asuba@wfchocolate.com",
  "rjohnson@wfchocolate.com",
  "krechtorik@wfchocolate.com",
  "ahughes@wfchocolate.com",
  "rfain@wfchocolate.com",
  "dralph@wfchocolate.com",
  "rthind@wfchocolate.com",
  "david.plant@bounteous.com",
])

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY environment variable is not set")
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const conn = postgres(process.env.DATABASE_URL, { prepare: false })
  const db = drizzle(conn, { schema })

  let inactiveUsersCount = 0
  let totalUsersCount = 0

  let offset = 0
  const limit = 100

  while (true) {
    const { data: clerkUsers = [] } = await clerkClient.users.getUserList({ limit, offset })
    if (clerkUsers.length === 0) break

    totalUsersCount += clerkUsers.length
    console.log(`fetched batch at offset ${offset}, found ${clerkUsers.length} users`)

    const cutoffMs = Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

    const inactiveClerkUsers = clerkUsers.filter((user: User) => {
      const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()

      if (email && WHITELISTED_EMAILS.has(email)) return false

      const lastSignIn = user.lastSignInAt ? new Date(user.lastSignInAt).getTime() : 0

      return lastSignIn < cutoffMs
    })

    console.log(
      `found ${inactiveClerkUsers.length} inactive users (no sign-in in last ${INACTIVITY_THRESHOLD_DAYS} days, excluding whitelist) in this batch`
    )

    inactiveUsersCount += inactiveClerkUsers.length

    await Promise.all(
      inactiveClerkUsers.map(async clerkUser => {
        await clerkClient.users.deleteUser(clerkUser.id)

        await db
          .update(schema.users)
          .set({ deletedAt: new Date(), status: UsersStatusEnum.DELETED })
          .where(eq(schema.users.clerkId, clerkUser.id))

        console.log(`Deleted inactive user ${clerkUser.id}, email: ${clerkUser.emailAddresses?.[0]?.emailAddress}`)
      })
    )

    if (clerkUsers.length < limit) {
      break
    }
    offset += limit
  }

  console.log(`\nTotal users: ${totalUsersCount}`)
  console.log(`Total inactive users: ${inactiveUsersCount}`)
}

try {
  await main()
  console.log("\n🎉 Clerk inactive users deleted successfully")
  process.exit(0)
} catch (error) {
  console.error("\nError deleting inactive clerk users:", error)
  process.exit(1)
}
