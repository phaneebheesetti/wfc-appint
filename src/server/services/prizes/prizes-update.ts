import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { PRIZE_SEQUENCE_INVALID_ERROR } from "@/constants/prize-sequence"
import type { db } from "@/server/db"
import { type PrizeInsert, type PrizeSelect, prizes } from "@/server/db/schema"

export const prizesUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<PrizeInsert> & { id?: string | null }
}): Promise<PrizeSelect | undefined> => {
  // Check the current row when the previous prize link is being edited
  if (input.previousPrizeId === undefined) {
    const [prize] = await database.update(prizes).set(input).where(eq(prizes.id, input.id!)).returning()
    return prize
  }

  const [current] = input.id ? await database.select().from(prizes).where(eq(prizes.id, input.id)).limit(1) : []

  const previousChanged =
    !!current && input.previousPrizeId !== undefined && (input.previousPrizeId ?? null) !== current.previousPrizeId

  if (!current || !previousChanged) {
    const [prize] = await database.update(prizes).set(input).where(eq(prizes.id, input.id!)).returning()
    return prize
  }

  if (current.prizeTemplateSlug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The Previous Prize of a template prize cannot be updated." })
  }

  const newPreviousId = input.previousPrizeId ?? null

  return database.transaction(async tx => {
    if (newPreviousId) {
      const [previous] = await tx.select().from(prizes).where(eq(prizes.id, newPreviousId)).limit(1)
      if (!previous || previous.campaignId !== current.campaignId || previous.id === current.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: PRIZE_SEQUENCE_INVALID_ERROR })
      }
      if (previous.nextPrizeId && previous.nextPrizeId !== current.id) {
        const [existingNext] = await tx
          .select({ active: prizes.active })
          .from(prizes)
          .where(eq(prizes.id, previous.nextPrizeId))
          .limit(1)
        if (existingNext?.active) throw new TRPCError({ code: "BAD_REQUEST", message: PRIZE_SEQUENCE_INVALID_ERROR })
      }
    }

    // The chosen previous prize is already linked to other prize
    const visited = new Set<string>()
    let cursorId: string | null = newPreviousId
    while (cursorId && !visited.has(cursorId)) {
      if (cursorId === current.id) throw new TRPCError({ code: "BAD_REQUEST", message: PRIZE_SEQUENCE_INVALID_ERROR })
      visited.add(cursorId)
      const [step] = await tx
        .select({ previousPrizeId: prizes.previousPrizeId })
        .from(prizes)
        .where(eq(prizes.id, cursorId))
        .limit(1)
      cursorId = step?.previousPrizeId ?? null
    }

    if (current.previousPrizeId) {
      await tx
        .update(prizes)
        .set({ nextPrizeId: null })
        .where(and(eq(prizes.id, current.previousPrizeId), eq(prizes.nextPrizeId, current.id)))
    }
    if (newPreviousId) {
      await tx.update(prizes).set({ nextPrizeId: current.id }).where(eq(prizes.id, newPreviousId))
    }

    const [prize] = await tx
      .update(prizes)
      .set({ ...input, previousPrizeId: newPreviousId })
      .where(eq(prizes.id, current.id))
      .returning()
    return prize
  })
}
