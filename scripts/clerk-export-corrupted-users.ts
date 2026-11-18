import { type User, createClerkClient } from "@clerk/backend"
import "dotenv/config"
import * as fs from "fs"
import * as path from "path"

interface CorruptedUser {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: string
  databaseId: string
}

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY environment variable is not set")
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const corruptedUsers: CorruptedUser[] = []
  let totalUsersCount = 0

  let offset = 0
  const limit = 100

  while (true) {
    const { data: clerkUsers = [] } = await clerkClient.users.getUserList({ limit, offset })
    if (clerkUsers.length === 0) break

    totalUsersCount += clerkUsers.length
    console.log(`fetched batch at offset ${offset}, found ${clerkUsers.length} users`)

    const corruptedClerkUsers = clerkUsers.filter(
      (user: User) => !user.publicMetadata.role || !user.publicMetadata.databaseId
    )
    console.log(`found ${corruptedClerkUsers.length} corrupted users in this batch`)

    for (const user of corruptedClerkUsers) {
      corruptedUsers.push({
        clerkId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        role: (user.publicMetadata.role as string) ?? "",
        databaseId: (user.publicMetadata.databaseId as string) ?? "",
      })
    }

    if (clerkUsers.length < limit) {
      break
    }
    offset += limit
  }

  const csvHeader = "clerkId,email,firstName,lastName,role,databaseId"
  const csvRows = corruptedUsers.map(
    user => `${user.clerkId},${user.email},${user.firstName},${user.lastName},${user.role},${user.databaseId}`
  )
  const csvContent = [csvHeader, ...csvRows].join("\n")

  const outputPath = path.join(import.meta.dirname, "clerk-corrupted-users.csv")
  fs.writeFileSync(outputPath, csvContent, "utf-8")

  console.log(`\nTotal users: ${totalUsersCount}`)
  console.log(`Total corrupted users: ${corruptedUsers.length}`)
  console.log(`CSV exported to: ${outputPath}`)
}

try {
  await main()
  console.log("\n🎉 Clerk users exported successfully")
  process.exit(0)
} catch (error) {
  console.error("\nError exporting corrupted clerk users:", error)
  process.exit(1)
}
