import { createClerkClient } from "@clerk/backend"
import "dotenv/config"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"

import * as schema from "./schema"

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const conn = postgres(process.env.DATABASE_URL, { prepare: false })
  const db = drizzle(conn, { schema })
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  try {
    const email = process.argv[2]
    if (!email) throw new Error("Please provide an email address as an argument")
    console.log(`Email:\n${email} \n`)

    const fullName = process.argv[3]
    if (!fullName) throw new Error("Please provide a full name as an argument")
    console.log(`Full Name:\n${fullName} \n`)
    const [firstName = "", lastName = ""] = fullName.split(" ")

    const roleInput = process.argv[4]
    const role = roleInput ? (roleInput as RolesEnum) : RolesEnum.ADMIN
    if (!Object.values(RolesEnum).includes(role)) throw new Error("Invalid role")
    console.log(`Role:\n${role} \n`)

    let clerkUser = null
    try {
      const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [email] })
      clerkUser = clerkUsers.data[0]
    } catch (e) {
      console.log(`Email ${email} was not found in Clerk \n`, e)
    }

    if (!clerkUser) {
      const createdClerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        firstName,
        lastName,
      })
      clerkUser = createdClerkUser
    }
    if (!clerkUser?.id) throw new Error("Failed to create clerk user")
    console.log(`Clerk User:\n${JSON.stringify(clerkUser)} \n`)

    const createdUser = await db
      .insert(schema.users)
      .values({
        id: clerkUser?.publicMetadata?.databaseId ?? undefined,
        clerkId: clerkUser?.id,
        email,
        role,
        firstName,
        lastName,
        fullName,
        status: UsersStatusEnum.ACTIVE,
      })
      .returning()
    if (!createdUser[0]) throw new Error("Failed to create user")
    console.log(`Database User:\n${JSON.stringify(createdUser[0])} \n`)

    await clerkClient.users.updateUser(clerkUser.id, {
      publicMetadata: {
        databaseId: createdUser[0].id,
        role,
      },
    })
  } finally {
    await conn.end()
  }
}

try {
  await main()
  console.log("🎉 Database setup successfully")
  process.exit(0)
} catch (error) {
  console.error("Error setting up database:", error)
  process.exit(1)
}
