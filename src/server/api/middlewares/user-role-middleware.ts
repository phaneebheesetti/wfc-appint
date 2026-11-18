import { sql } from "drizzle-orm"

import { t } from "@/server/api/core"
import { type db } from "@/server/db"

export const userRoleMiddleware = t.middleware(async ({ ctx, next }) => {
  const userId = ctx.userId
  const userRole = ctx.userRole
  const jwtClaims = { user_role: userRole }

  return await ctx.db.transaction(async tx => {
    await tx.execute(sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(jwtClaims)}, true)`)

    // SET LOCAL so the role is scoped to this transaction; otherwise the pooled
    // connection carries `ROLE authenticated` back into the pool and taints
    // subsequent queries (including the unscoped global db) with RLS.
    if (userId) {
      await tx.execute(sql`SET LOCAL role = 'authenticated'`)
    } else {
      await tx.execute(sql`SET LOCAL role = 'anon'`)
    }

    const result = await next({
      ctx: {
        ...ctx,
        db: tx as unknown as typeof db, // Override the db with the transaction instance
      },
    })

    // Transaction will automatically commit if no errors occur
    return result
  })
})
