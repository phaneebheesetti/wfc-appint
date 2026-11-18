import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DigitalSalesDetails, digitalSalesInformation } from "@/server/db/schema"

export const digitalSalesInformationToggleSalesPage = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    participantId: string
    fundraiserId: string
    actingUserId: string
    isActive: boolean
  }
}) => {
  const nowIso = new Date().toISOString()

  const existing = await database.query.digitalSalesInformation.findFirst({
    where: and(
      eq(digitalSalesInformation.participantId, input.participantId),
      eq(digitalSalesInformation.fundraiserId, input.fundraiserId)
    ),
  })

  const existingDetails: DigitalSalesDetails = existing?.digitalSalesDetails ?? {}

  const existingSalesPage = existingDetails.enable_sales_page

  const isFirstSave = !existingSalesPage?.created_at

  const digitalSalesDetails: DigitalSalesDetails = {
    ...existingDetails,
    enable_sales_page: {
      is_active: input.isActive,
      url: existing?.id ?? "",
      created_at: existingSalesPage?.created_at ?? nowIso,
      created_by: existingSalesPage?.created_by ?? input.actingUserId,
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
