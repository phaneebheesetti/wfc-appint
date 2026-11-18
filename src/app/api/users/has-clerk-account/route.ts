import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { UsersStatusEnum } from "@/constants/users"
import { type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { withSentry } from "@/utils/api"

const querySchema = z.object({
  databaseId: z.string().min(1),
})

// Reports whether the EMAIL associated with this databaseId belongs to a Clerk
// account that has actually completed onboarding — i.e. any live users row
// for that email has a non-null clerk_id AND status = ACTIVE. Used by the
// multi-role invite flow:
//   - both rows PENDING → false (let the invitee accept)
//   - after first acceptance flips a sibling to ACTIVE → true
// `clerk_id IS NOT NULL` alone is not enough: the parent-via-participant flow
// pre-creates a Clerk user (clerk_id is set) before the human ever signs in,
// so we'd misreport that user as already-signed-up. Email comparison is
// case-insensitive so pre-multi-role rows with mixed-case emails still
// resolve to the same identity as the lowercased Clerk email.
export const GET = withSentry(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { databaseId } = querySchema.parse({
    databaseId: url.searchParams.get("databaseId"),
  })

  const serviceClient = createServiceClient()
  const { data: row } = (await serviceClient
    .from("users")
    .select("email")
    .eq("id", databaseId)
    .is("deleted_at", null)
    .maybeSingle()) as { data: Pick<SupabaseUser, "email"> | null }

  if (!row?.email) return NextResponse.json({ data: { hasClerkAccount: false } }, { status: 200 })

  const target = row.email.trim().toLowerCase()
  const siblings = await db.query.users.findMany({
    where: and(
      isNull(users.deletedAt),
      isNotNull(users.clerkId),
      eq(users.status, UsersStatusEnum.ACTIVE),
      sql`lower(${users.email}) = ${target}`
    ),
    columns: { id: true },
    limit: 1,
  })

  return NextResponse.json({ data: { hasClerkAccount: siblings.length > 0 } }, { status: 200 })
})
