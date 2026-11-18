import { createClerkClient } from "@clerk/backend"
import "dotenv/config"
import * as fs from "fs"
import * as path from "path"

interface ExportedUser {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  lastSignInAt: string
  role: string
  databaseId: string
}

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY environment variable is not set")
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const allUsers: ExportedUser[] = []
  let totalUsersCount = 0

  let offset = 0
  const limit = 100

  while (true) {
    const { data: clerkUsers = [] } = await clerkClient.users.getUserList({ limit, offset })
    if (clerkUsers.length === 0) break

    totalUsersCount += clerkUsers.length
    console.log(`fetched batch at offset ${offset}, found ${clerkUsers.length} users`)

    for (const user of clerkUsers) {
      allUsers.push({
        clerkId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : "",
        role: (user.publicMetadata?.role as string) ?? "",
        databaseId: (user.publicMetadata?.databaseId as string) ?? "",
      })
    }

    if (clerkUsers.length < limit) {
      break
    }
    offset += limit
  }

  allUsers.sort((a, b) => {
    if (!a.lastSignInAt) return -1
    if (!b.lastSignInAt) return 1
    return new Date(a.lastSignInAt).getTime() - new Date(b.lastSignInAt).getTime()
  })

  const csvHeader = "clerkId,email,firstName,lastName,lastSignInAt,role,databaseId"
  const csvRows = allUsers.map(user =>
    [
      escapeCsvField(user.clerkId),
      escapeCsvField(user.email),
      escapeCsvField(user.firstName),
      escapeCsvField(user.lastName),
      escapeCsvField(user.lastSignInAt),
      escapeCsvField(user.role),
      escapeCsvField(user.databaseId),
    ].join(",")
  )
  const csvContent = [csvHeader, ...csvRows].join("\n")

  const outputPath = path.join(import.meta.dirname, "clerk-users-by-last-sign-in.csv")
  fs.writeFileSync(outputPath, csvContent, "utf-8")

  console.log(`\nTotal users: ${totalUsersCount}`)
  console.log(`CSV exported to: ${outputPath}`)
}

try {
  await main()
  console.log("\n🎉 Clerk users exported successfully")
  process.exit(0)
} catch (error) {
  console.error("\nError exporting clerk users by last sign-in:", error)
  process.exit(1)
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
