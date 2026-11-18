/**
 * Clerk Playwright setup: https://clerk.com/docs/guides/development/testing/playwright/overview
 * Obtains a Testing Token so tests can bypass bot detection when signing in.
 * Ensures all test users in testUsers exist in Clerk and the database (find by email, create if missing).
 * Each user uses a fixed databaseId so the same id works in both local and staging/production DBs with one Clerk account.
 */
import { createClerkClient } from "@clerk/backend"
import { clerkSetup } from "@clerk/testing/playwright"
import { config } from "dotenv"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import * as schema from "@/server/db/schema"

config()

export interface TestUser {
  email: string
  name: string
  role: RolesEnum
  databaseId: string
  parentId?: string
}

const testUserWfcAdmin: TestUser = {
  email: "e2e_wfc_admin+clerk_test@example.com",
  name: "E2E WFC Admin",
  role: RolesEnum.WFC_ADMIN,
  databaseId: "e2e00000-0000-4000-8000-000000000003",
}

const testUserSalesManager: TestUser = {
  email: "e2e_sales_manager+clerk_test@example.com",
  name: "E2E Sales Manager",
  role: RolesEnum.SALES_MANAGER,
  databaseId: "e2e00000-0000-4000-8000-000000000004",
}

const testUserSalesRepresentative: TestUser = {
  email: "e2e_sales_representative+clerk_test@example.com",
  name: "E2E Sales Representative",
  role: RolesEnum.SALES_REPRESENTATIVE,
  databaseId: "e2e00000-0000-4000-8000-000000000005",
}

const testUserOrganizationAdmin: TestUser = {
  email: "e2e_organization_admin+clerk_test@example.com",
  name: "E2E Organization Admin",
  role: RolesEnum.ORGANIZATION_ADMIN,
  databaseId: "e2e00000-0000-4000-8000-000000000006",
}

const testUserOrganizationStaff: TestUser = {
  email: "e2e_organization_staff+clerk_test@example.com",
  name: "E2E Organization Staff",
  role: RolesEnum.ORGANIZATION_STAFF,
  databaseId: "e2e00000-0000-4000-8000-000000000007",
}

const testUserParent: TestUser = {
  email: "e2e_parent+clerk_test@example.com",
  name: "E2E Parent",
  role: RolesEnum.PARENT,
  databaseId: "e2e00000-0000-4000-8000-000000000009",
}

const testUserParticipant: TestUser = {
  email: "e2e_participant+clerk_test@example.com",
  name: "E2E Participant",
  role: RolesEnum.PARTICIPANT,
  databaseId: "e2e00000-0000-4000-8000-000000000008",
  parentId: "e2e00000-0000-4000-8000-000000000009",
}

export const testUsers: TestUser[] = [
  testUserWfcAdmin,
  testUserSalesManager,
  testUserSalesRepresentative,
  testUserOrganizationAdmin,
  testUserOrganizationStaff,
  testUserParent,
  testUserParticipant,
]

export const testUsersByRole: Partial<Record<RolesEnum, TestUser>> = {
  [RolesEnum.WFC_ADMIN]: testUserWfcAdmin,
  [RolesEnum.SALES_MANAGER]: testUserSalesManager,
  [RolesEnum.SALES_REPRESENTATIVE]: testUserSalesRepresentative,
  [RolesEnum.ORGANIZATION_ADMIN]: testUserOrganizationAdmin,
  [RolesEnum.ORGANIZATION_STAFF]: testUserOrganizationStaff,
  [RolesEnum.PARENT]: testUserParent,
  [RolesEnum.PARTICIPANT]: testUserParticipant,
}

type ClerkClient = ReturnType<typeof createClerkClient>
type ClerkPublicMetadata = { databaseId?: string; role?: string }
type Db = ReturnType<typeof drizzle<typeof schema>>

type ClerkUserLike = {
  id: string
  publicMetadata?: ClerkPublicMetadata
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses?: { emailAddress: string }[]
}

const E2E_LAST_NAME = "Test User"

function getEmailFromClerkUser(user: ClerkUserLike): string | undefined {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress
}

function buildClerkByEmailMap(clerkUsers: ClerkUserLike[]): Map<string, ClerkUserLike> {
  const map = new Map<string, ClerkUserLike>()
  for (const user of clerkUsers) {
    const email = getEmailFromClerkUser(user)
    if (email) map.set(email, user)
  }
  return map
}

async function createClerkUser(clerkClient: ClerkClient, user: TestUser): Promise<ClerkUserLike> {
  const created = await clerkClient.users.createUser({
    emailAddress: [user.email],
    firstName: user.name || undefined,
    lastName: E2E_LAST_NAME,
  })
  if (!created?.id) {
    throw new Error(`Failed to create Clerk user for ${user.email}`)
  }
  return created as ClerkUserLike
}

async function createDatabaseUser(db: Db, user: TestUser, clerkId: string): Promise<schema.UserSelect> {
  const { email, name, role, databaseId, parentId } = user
  const [upserted] = await db
    .insert(schema.users)
    .values({
      id: databaseId,
      clerkId,
      email,
      role,
      firstName: name || null,
      lastName: E2E_LAST_NAME,
      fullName: name,
      status: UsersStatusEnum.ACTIVE,
      ...(parentId != null && { parentUserId: parentId }),
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        clerkId,
        email,
        role,
        firstName: name || null,
        lastName: E2E_LAST_NAME,
        fullName: name,
        status: UsersStatusEnum.ACTIVE,
        ...(parentId != null && { parentUserId: parentId }),
      },
    })
    .returning()

  if (!upserted) {
    throw new Error(`Failed to upsert database user for ${email}`)
  }
  return upserted
}

async function ensureAllTestUsers(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!databaseUrl || !clerkSecretKey) {
    throw new Error(
      "DATABASE_URL and CLERK_SECRET_KEY are required to ensure e2e test users exist in Clerk and the database"
    )
  }

  const conn = postgres(databaseUrl, { prepare: false })
  const db = drizzle(conn, { schema })
  const clerkClient = createClerkClient({ secretKey: clerkSecretKey })

  try {
    const emails = testUsers.map(u => u.email)

    const dbRows = await db.select().from(schema.users).where(inArray(schema.users.email, emails))
    const dbByEmail = new Map(dbRows.map(r => [r.email, r]))

    let clerkList: { data: ClerkUserLike[] }
    try {
      clerkList = (await clerkClient.users.getUserList({ emailAddress: emails })) as { data: ClerkUserLike[] }
    } catch {
      clerkList = { data: [] }
    }
    const clerkByEmail = buildClerkByEmailMap(clerkList.data)

    const clerkUpdates: Array<() => Promise<unknown>> = []
    const dbUpdates: Array<() => Promise<unknown>> = []

    for (const user of testUsers) {
      const { email, role, databaseId, parentId } = user
      let clerkUser = clerkByEmail.get(email)
      let dbUser = dbByEmail.get(email)

      if (!clerkUser) {
        clerkUser = await createClerkUser(clerkClient, user)
        clerkByEmail.set(email, clerkUser)
      }

      if (!dbUser) {
        dbUser = await createDatabaseUser(db, user, clerkUser.id)
        dbByEmail.set(email, dbUser)
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: { databaseId, role },
        })
        continue
      }

      const currentMetadata = clerkUser.publicMetadata as ClerkPublicMetadata | undefined
      const dbId = dbUser.id
      const needsClerkSync =
        !currentMetadata?.databaseId || currentMetadata.databaseId !== dbId || currentMetadata.role !== role

      if (needsClerkSync) {
        const clerkUserId = clerkUser.id
        clerkUpdates.push(() =>
          clerkClient.users.updateUser(clerkUserId, {
            publicMetadata: { databaseId: dbId, role },
          })
        )
      }

      const updates: { clerkId?: string; parentUserId?: string | null } = {}
      if (!dbUser.clerkId || dbUser.clerkId !== clerkUser.id) {
        updates.clerkId = clerkUser.id
      }
      if (parentId != null && dbUser.parentUserId !== parentId) {
        updates.parentUserId = parentId
      }
      if (Object.keys(updates).length > 0) {
        const userId = dbUser.id
        dbUpdates.push(() => db.update(schema.users).set(updates).where(eq(schema.users.id, userId)))
      }
    }

    await Promise.all([...clerkUpdates.map(fn => fn()), ...dbUpdates.map(fn => fn())])
  } finally {
    await conn.end()
  }
}

async function globalSetup() {
  await ensureAllTestUsers()

  await clerkSetup()
}

export default globalSetup
