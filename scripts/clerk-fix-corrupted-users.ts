import { createClerkClient } from "@clerk/backend"
import "dotenv/config"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { type RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import * as schema from "@/server/db/schema"

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

  try {
    let totalUsersCount = 0
    let totalCorruptedCount = 0

    let offset = 0
    const limit = 100

    while (true) {
      const { data: clerkUsers = [] } = await clerkClient.users.getUserList({ limit, offset })
      if (clerkUsers.length === 0) break

      totalUsersCount += clerkUsers.length
      console.log(`fetched batch at offset ${offset}, found ${clerkUsers.length} users`)

      const corruptedClerkUsers = clerkUsers.filter(
        user => !user.publicMetadata.role || !user.publicMetadata.databaseId
      )
      totalCorruptedCount += corruptedClerkUsers.length
      console.log(`found ${corruptedClerkUsers.length} corrupted users`)

      const corruptedDatabaseUsers = await db
        .select()
        .from(schema.users)
        .where(
          inArray(
            schema.users.email,
            corruptedClerkUsers.map(user => user.emailAddresses?.[0]?.emailAddress ?? "")
          )
        )
      console.log(`found ${corruptedDatabaseUsers.length} corrupted database users`)

      const corruptedDatabaseUsersByEmail = corruptedDatabaseUsers
        .filter(user => user.email != null)
        .reduce(
          (acc, user) => {
            acc[user.email!] = user
            return acc
          },
          {} as Record<string, schema.User>
        )

      for (const clerkUser of corruptedClerkUsers) {
        const email = clerkUser.emailAddresses?.[0]?.emailAddress
        if (!email) continue

        const databaseUser = corruptedDatabaseUsersByEmail[email]
        if (!databaseUser) continue

        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: {
            role: databaseUser.role as RolesEnum,
            databaseId: databaseUser.id,
          },
        })
        console.log(
          `Updated Clerk user ${clerkUser.id} (${clerkUser.emailAddresses?.[0]?.emailAddress}) with role=${databaseUser.role}, databaseId=${databaseUser.id}`
        )

        const firstName = clerkUser.firstName ?? undefined
        const lastName = clerkUser.lastName ?? undefined
        const fullName = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser?.lastName ?? ""}` : undefined

        await db
          .update(schema.users)
          .set({
            firstName,
            lastName,
            fullName,
            clerkId: clerkUser.id,
            status: UsersStatusEnum.ACTIVE,
          })
          .where(eq(schema.users.id, databaseUser.id))
        console.log(
          `Updated database user ${databaseUser.id} with firstName=${firstName}, lastName=${lastName}, fullName=${fullName}, clerkId=${clerkUser.id}`
        )
      }

      if (clerkUsers.length < limit) {
        // No more users to fetch
        break
      }
      offset += limit
    }

    console.log(`Total users processed: ${totalUsersCount}`)
    console.log(`Total corrupted users: ${totalCorruptedCount}`)
  } finally {
    await conn.end()
  }
}

try {
  await main()
  console.log("🎉 Users added successfully")
  process.exit(0)
} catch (error) {
  console.error("Error adding users:", error)
  process.exit(1)
}
