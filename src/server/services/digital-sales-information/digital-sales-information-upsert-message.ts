import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DigitalSalesDetails, digitalSalesInformation } from "@/server/db/schema"

/**
 * Creates the row (if missing) with the personal message, or updates the
 * message on an existing row. On first save `created_at`/`created_by` are
 * stamped and `updated_at`/`updated_by` stay null (matching the repo's
 * `timestamps` convention); on later edits `created_*` are preserved and
 * `updated_*` are set. Only the `personal_message` key of the blob is touched —
 * sibling keys (inventory_details, enable_sales_page) are preserved.
 */
export const digitalSalesInformationUpsertMessage = async ({
  database,
  input,
}: {
  database: typeof db
  input: { participantId: string; fundraiserId: string; message: string; actingUserId: string }
}) => {
  const nowIso = new Date().toISOString()

  const existing = await database.query.digitalSalesInformation.findFirst({
    where: and(
      eq(digitalSalesInformation.participantId, input.participantId),
      eq(digitalSalesInformation.fundraiserId, input.fundraiserId)
    ),
  })

  const existingDetails: DigitalSalesDetails = existing?.digitalSalesDetails ?? {}
  const existingMessage = existingDetails.personal_message
  const isFirstSave = !existingMessage?.created_at

  const digitalSalesDetails: DigitalSalesDetails = {
    ...existingDetails,
    personal_message: {
      message: input.message,
      created_at: existingMessage?.created_at ?? nowIso,
      created_by: existingMessage?.created_by ?? input.actingUserId,
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
