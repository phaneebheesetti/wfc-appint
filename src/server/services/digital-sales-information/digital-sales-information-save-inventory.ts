import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { BARS_PER_CASE } from "@/constants/inventory"
import type { db } from "@/server/db"
import { type DigitalSalesDetails, digitalSalesInformation } from "@/server/db/schema"

/**
 * Saves the Inventory step, for both the initial setup ("setup") and the ongoing
 * Manage Inventory flow ("update").
 *
 * `total_bars` is derived from `BARS_PER_CASE` — the feature supports a single
 * product (a 40-bar chocolate case) — not looked up from the parent's checkout.
 * `sold_online` is always preserved from the existing record. `sold_in_person` is
 * preserved from the existing record for "setup" (it's not editable from that
 * flow), or taken from `soldInPerson` for "update".
 */
export const digitalSalesInformationSaveInventory = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    participantId: string
    fundraiserId: string
    actingUserId: string
    casesCheckedOut: number
    source: "setup" | "update"
    soldInPerson?: number
  }
}) => {
  const existing = await database.query.digitalSalesInformation.findFirst({
    where: and(
      eq(digitalSalesInformation.participantId, input.participantId),
      eq(digitalSalesInformation.fundraiserId, input.fundraiserId)
    ),
  })

  const nowIso = new Date().toISOString()
  const existingDetails: DigitalSalesDetails = existing?.digitalSalesDetails ?? {}
  const existingInventory = existingDetails.inventory_details
  const isFirstSave = !existingInventory || Object.keys(existingInventory).length == 0

  const totalBars = input.casesCheckedOut * BARS_PER_CASE
  const soldInPerson = input.source === "update" ? (input.soldInPerson ?? 0) : (existingInventory?.sold_in_person ?? 0)
  const soldOnline = existingInventory?.sold_online ?? 0

  if (totalBars < soldInPerson + soldOnline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Total bars cannot be less than the bars already sold in-person and online",
    })
  }

  const digitalSalesDetails: DigitalSalesDetails = {
    ...existingDetails,
    inventory_details: {
      cases_checked_out: input.casesCheckedOut,
      total_bars: totalBars,
      sold_in_person: soldInPerson,
      sold_online: soldOnline,
      marked_done: true,
      created_at: existingInventory?.created_at ?? nowIso,
      created_by: existingInventory?.created_by ?? input.actingUserId,
      updated_at: isFirstSave ? null : nowIso,
      updated_by: isFirstSave ? null : input.actingUserId,
    },
  }

  if (existing) {
    const [row] = await database
      .update(digitalSalesInformation)
      .set({ digitalSalesDetails })
      .where(eq(digitalSalesInformation.id, existing.id))
      .returning()
    return row
  }

  const [row] = await database
    .insert(digitalSalesInformation)
    .values({
      participantId: input.participantId,
      fundraiserId: input.fundraiserId,
      digitalSalesDetails,
    })
    .returning()
  return row
}
